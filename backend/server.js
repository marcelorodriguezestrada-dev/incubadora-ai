import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { Groq } from 'groq-sdk'
import { createClient } from '@supabase/supabase-js'
import { getPlan, puedeEvaluar, incrementarUso, PLANES } from './plans.js'

const app = express()
app.use(express.json())
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    /\.onrender\.com$/
  ],
  credentials: true,
}))

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
)

// ── Helpers ──────────────────────────────────────────────────────────────────

async function callGroq(system, user, maxTokens = 2000, temp = 0.3) {
  const r = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: maxTokens,
    temperature: temp,
    messages: [
      { role: 'system', content: system + '\n\nIMPORTANTE: Respondé ÚNICAMENTE con JSON válido. Sin texto adicional. Sin markdown. Sin caracteres especiales fuera del JSON.' },
      { role: 'user', content: user },
    ],
  })
  const raw = r.choices[0].message.content

  // Limpiar el texto antes de parsear
  let clean = raw
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim()

  // Extraer solo el JSON (entre el primer { y el último })
  const start = clean.indexOf('{')
  const end = clean.lastIndexOf('}')
  if (start !== -1 && end !== -1) {
    clean = clean.slice(start, end + 1)
  }

  // Limpiar caracteres problemáticos
  clean = clean
    .replace(/[\x00-\x1F\x7F]/g, ' ')  // caracteres de control
    .replace(/,\s*}/g, '}')              // trailing commas en objetos
    .replace(/,\s*]/g, ']')              // trailing commas en arrays

  try {
    return JSON.parse(clean)
  } catch (e) {
    console.error('JSON parse error:', e.message)
    console.error('Raw response:', raw.slice(0, 500))
    throw new Error(`Groq devolvió JSON inválido: ${e.message}`)
  }
}

async function callGroqChat(system, messages, maxTokens = 800) {
  const r = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: maxTokens,
    temperature: 0.7,
    messages: [{ role: 'system', content: system }, ...messages],
  })
  return r.choices[0].message.content
}

function getUserId(req) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return null
  return auth.replace('Bearer ', '').slice(0, 36)
}

// ── Health ────────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' })
})

// ── Evaluar completo ──────────────────────────────────────────────────────────

app.post('/api/evaluar-completo', async (req, res) => {
  const { idea, sector, capital_disponible, plazo_meses = 12 } = req.body
  if (!idea) return res.status(400).json({ error: 'idea requerida' })
  const userId = await getUserId(req)

  // Verificar si puede evaluar
  if (userId) {
    const check = await puedeEvaluar(supabase, userId)
    if (!check.puede) {
      return res.status(403).json({
        error: 'limite_alcanzado',
        mensaje: `Alcanzaste el límite de ${check.limite} evaluaciones del plan Free este mes.`,
        plan: check.plan,
        usadas: check.usadas,
        limite: check.limite,
      })
    }
  }  

  try {
    const contexto = `IDEA: ${idea}\nSECTOR: ${sector || 'No especificado'}\nCAPITAL: ${capital_disponible ? `USD ${capital_disponible}` : 'No especificado'}\nHORIZONTE: ${plazo_meses} meses`

    // Correr financiero y mercado en paralelo
    const [financiero, mercado] = await Promise.all([
      callGroq(`Sos un analista financiero senior especializado en emprendimientos en Argentina.
Evaluás viabilidad financiera con contexto argentino real (inflación ~140%, cargas sociales 50%, IVA 21%).
JSON ESTRICTO:
{"capex_estimado_usd":0,"roi_estimado_pct":0,"payback_meses":0,"margen_bruto_pct":0,"punto_equilibrio_meses":0,"riesgo":"medio","notas":""}`, contexto, 1000),

      callGroq(`Sos un analista de mercado especializado en Argentina. El 95% de emprendimientos fracasan.
Evaluás con honestidad brutal.
JSON ESTRICTO:
{"score_viabilidad":0,"competidores_principales":[],"diferenciador_clave":"","tam_estimado":"","probabilidad_exito_pct":0,"advertencias":[]}`, contexto, 1000),
    ])

    // Roadmap con contexto del financiero y mercado
    const roadmapCtx = `${contexto}\nCAPEX: USD ${financiero.capex_estimado_usd}\nROI: ${financiero.roi_estimado_pct}%\nRIESGO: ${financiero.riesgo}\nSCORE MERCADO: ${mercado.score_viabilidad}/100`
    const roadmapData = await callGroq(`Sos consultor de estrategia. Generás roadmap de 8 semanas para llegar al primer ingreso.
JSON ESTRICTO:
{"roadmap":[{"semana":1,"hito":"","descripcion":"","responsable":"fundador","costo_estimado_usd":null}],"proximos_pasos":[]}`, roadmapCtx, 2000)

    // Escenarios inflacionarios
    const escCtx = `${contexto}\nCAPEX BASE: USD ${financiero.capex_estimado_usd}\nROI BASE: ${financiero.roi_estimado_pct}%\nPAYBACK: ${financiero.payback_meses} meses\nMARGEN: ${financiero.margen_bruto_pct}%`
    const escenarios = await callGroq(`Sos economista especializado en riesgo macroeconómico argentino.
Simulás 3 escenarios: OPTIMISTA (inflación 60%, devaluación 40%), BASE (140%, 100%), PESIMISTA (280%, 200%).
JSON ESTRICTO:
{"escenarios":[{"nombre":"Optimista","inflacion_anual_pct":60,"tipo_cambio_devaluacion_pct":40,"roi_ajustado_pct":0,"capex_ajustado_usd":0,"payback_ajustado_meses":0,"margen_real_pct":0,"sobrevive":true,"advertencia":""}],"recomendacion":"","cobertura_sugerida":""}`, escCtx, 2000)

    // Calcular score global
    const scoreFin = Math.max(0, Math.min(100, Math.round(financiero.roi_estimado_pct / 2)))
    const scoreGlobal = Math.round(scoreFin * 0.4 + mercado.score_viabilidad * 0.6)
    const veredicto = scoreGlobal >= 70 && financiero.riesgo !== 'alto' ? 'Viable'
      : scoreGlobal >= 50 ? 'Viable con ajustes' : 'No viable'

    const resultado = {
      idea_original: idea,
      score_global: scoreGlobal,
      veredicto,
      resumen_ejecutivo: `${veredicto}: ROI ${financiero.roi_estimado_pct}% en ${financiero.payback_meses} meses. Score mercado: ${mercado.score_viabilidad}/100. Prob. éxito: ${mercado.probabilidad_exito_pct}%.`,
      financiero,
      mercado,
      roadmap: roadmapData.roadmap || [],
      proximos_pasos: roadmapData.proximos_pasos || [],
    }

    // Guardar en Supabase si hay usuario
    const userId = getUserId(req)
    if (userId) {
      try {
        const { data } = await supabase.from('evaluaciones').insert({
          user_id: userId,
          idea_original: idea,
          score_global: scoreGlobal,
          veredicto,
          resultado_json: { ...resultado, escenarios },
        }).select('id').single()
        resultado.id = data?.id
      } catch (e) { console.error('Error guardando:', e.message) }
    }
    if (userId) await incrementarUso(supabase, userId)
    res.json({ resultado, escenarios })
  } catch (e) {
    console.error('Error evaluar:', e)
    res.status(500).json({ error: e.message })
  }
})

// ── Chat ──────────────────────────────────────────────────────────────────────

app.post('/api/chat', async (req, res) => {
  const { mensaje, historial = [], resultado_evaluacion, escenarios } = req.body
  if (!mensaje?.trim()) return res.status(400).json({ error: 'Mensaje vacío' })

  const fin = resultado_evaluacion?.financiero || {}
  const mer = resultado_evaluacion?.mercado || {}
  const ctx = [
    `IDEA: ${resultado_evaluacion?.idea_original}`,
    `VEREDICTO: ${resultado_evaluacion?.veredicto} (Score: ${resultado_evaluacion?.score_global}/100)`,
    `CAPEX: USD ${fin.capex_estimado_usd} | ROI: ${fin.roi_estimado_pct}% | Riesgo: ${fin.riesgo}`,
    `Mercado: score ${mer.score_viabilidad}/100 | Prob. éxito ${mer.probabilidad_exito_pct}%`,
    `Diferenciador: ${mer.diferenciador_clave}`,
  ].join('\n')

  try {
    const respuesta = await callGroqChat(
      `Sos el co-fundador IA de una incubadora argentina. Contexto:\n${ctx}\nRespondé directo y accionable, máximo 3 párrafos.`,
      [...historial.slice(-10), { role: 'user', content: mensaje }],
    )
    const SUGERENCIAS = ['¿Cómo bajo el CAPEX?', 'Dame 3 variantes del modelo', '¿Por dónde arranco mañana?', '¿Cómo me protejo de la inflación?']
    res.json({ respuesta, preguntas_sugeridas: SUGERENCIAS.sort(() => Math.random() - 0.5).slice(0, 4) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── Historial ─────────────────────────────────────────────────────────────────

app.get('/api/historial', async (req, res) => {
  const userId = getUserId(req)
  if (!userId) return res.status(401).json({ error: 'No autenticado' })
  try {
    const { data } = await supabase.from('evaluaciones')
      .select('id, idea_original, score_global, veredicto, created_at, resultado_json')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(50)
    const items = (data || []).map(row => ({
      id: row.id,
      idea_original: row.idea_original,
      score_global: row.score_global,
      veredicto: row.veredicto,
      created_at: row.created_at,
      capex_estimado_usd: row.resultado_json?.financiero?.capex_estimado_usd,
      roi_estimado_pct: row.resultado_json?.financiero?.roi_estimado_pct,
      riesgo: row.resultado_json?.financiero?.riesgo,
      probabilidad_exito_pct: row.resultado_json?.mercado?.probabilidad_exito_pct,
    }))
    res.json(items)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/historial/:id', async (req, res) => {
  const userId = getUserId(req)
  if (!userId) return res.status(401).json({ error: 'No autenticado' })
  try {
    const { data } = await supabase.from('evaluaciones')
      .select('*').eq('id', req.params.id).eq('user_id', userId).single()
    res.json(data)
  } catch (e) { res.status(404).json({ error: 'No encontrada' }) }
})

app.delete('/api/historial/:id', async (req, res) => {
  const userId = getUserId(req)
  if (!userId) return res.status(401).json({ error: 'No autenticado' })
  try {
    await supabase.from('evaluaciones').delete().eq('id', req.params.id).eq('user_id', userId)
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/historial/comparar', async (req, res) => {
  const userId = getUserId(req)
  if (!userId) return res.status(401).json({ error: 'No autenticado' })
  const { eval_id_a, eval_id_b } = req.body
  try {
    const [ra, rb] = await Promise.all([
      supabase.from('evaluaciones').select('resultado_json, created_at').eq('id', eval_id_a).eq('user_id', userId).single(),
      supabase.from('evaluaciones').select('resultado_json, created_at').eq('id', eval_id_b).eq('user_id', userId).single(),
    ])
    const a = ra.data.resultado_json, b = rb.data.resultado_json
    const delta = (va, vb, hib = true) => {
      try {
        const diff = parseFloat(vb) - parseFloat(va)
        const pct = va != 0 ? Math.round(diff / parseFloat(va) * 100 * 10) / 10 : 0
        return { valor_a: va, valor_b: vb, diff: Math.round(diff * 100) / 100, pct, mejor: (diff > 0) === hib }
      } catch { return { valor_a: va, valor_b: vb, diff: null, pct: null, mejor: null } }
    }
    res.json({
      eval_a: { id: eval_id_a, fecha: ra.data.created_at, idea: a?.idea_original?.slice(0, 80) },
      eval_b: { id: eval_id_b, fecha: rb.data.created_at, idea: b?.idea_original?.slice(0, 80) },
      metricas: {
        score_global: delta(a?.score_global, b?.score_global),
        roi_estimado_pct: delta(a?.financiero?.roi_estimado_pct, b?.financiero?.roi_estimado_pct),
        capex_estimado_usd: delta(a?.financiero?.capex_estimado_usd, b?.financiero?.capex_estimado_usd, false),
        payback_meses: delta(a?.financiero?.payback_meses, b?.financiero?.payback_meses, false),
        margen_bruto_pct: delta(a?.financiero?.margen_bruto_pct, b?.financiero?.margen_bruto_pct),
        score_viabilidad: delta(a?.mercado?.score_viabilidad, b?.mercado?.score_viabilidad),
        probabilidad_exito_pct: delta(a?.mercado?.probabilidad_exito_pct, b?.mercado?.probabilidad_exito_pct),
      },
      veredictos: { a: a?.veredicto, b: b?.veredicto, mejoro: b?.score_global > a?.score_global },
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/me', async (req, res) => {
  const userId = getUserId(req)
  if (!userId) return res.status(401).json({ error: 'No autenticado' })
  res.json({ id: userId })
})

// ── Start ─────────────────────────────────────────────────────────────────────


// ── Plan del usuario ──────────────────────────────────────────────────────────

app.get('/api/plan', async (req, res) => {
  const userId = await getUserId(req)
  if (!userId) return res.json({ plan: 'free', ...PLANES.free })
  const plan = await getPlan(supabase, userId)
  const check = await puedeEvaluar(supabase, userId)
  res.json({
    plan,
    ...PLANES[plan],
    usadas: check.usadas || 0,
    restantes: check.restantes,
  })
})

// ── Variantes del modelo (solo Pro y Elite) ───────────────────────────────────

app.post('/api/variantes', async (req, res) => {
  const userId = await getUserId(req)
  const plan = await getPlan(supabase, userId)

  if (!PLANES[plan].variantes_modelo) {
    return res.status(403).json({
      error: 'plan_requerido',
      mensaje: 'Las variantes del modelo requieren Plan Pro o Elite.',
      plan_requerido: 'pro',
    })
  }

  const { resultado } = req.body
  if (!resultado) return res.status(400).json({ error: 'resultado requerido' })

  try {
    const data = await callGroq(
      `Sos un estratega de negocios especializado en Argentina.
Dado un modelo de negocio que necesita ajustes, generás 3 variantes alternativas viables.
Cada variante tiene distinto enfoque: una más conservadora, una igual y una más agresiva.
JSON ESTRICTO:
{"variantes":[{"nombre":"","descripcion":"","cambio_clave":"","capex_estimado_usd":0,"roi_estimado_pct":0,"por_que_funciona":""}]}`,
      `IDEA ORIGINAL: ${resultado.idea_original}
VEREDICTO: ${resultado.veredicto}
PROBLEMA PRINCIPAL: ${resultado.financiero?.notas}
ADVERTENCIAS: ${resultado.mercado?.advertencias?.join(', ')}
Generá 3 variantes del modelo que sí funcionen.`,
      2000
    )
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

const PORT = process.env.PORT || 8000
app.listen(PORT, () => console.log(`✓ Incubadora AI corriendo en puerto ${PORT}`))