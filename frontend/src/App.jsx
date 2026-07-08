/**
 * App.jsx actualizado con auth real.
 * - Usa useAuth() para manejar sesión
 * - Muestra AuthScreen si no hay usuario
 * - Pasa token a todos los componentes que hacen llamadas al backend
 */
import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import AuthScreen from './components/AuthScreen'
import EscenariosPanel from './components/EscenariosPanel'
import ChatCofundador from './components/ChatCofundador'
import HistorialPanel from './components/HistorialPanel'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const SCORE_COLOR = (s) => s >= 70 ? '#00c853' : s >= 50 ? '#ffd740' : '#ff5252'
const RIESGO_COLOR = { bajo: '#00c853', medio: '#ffd740', alto: '#ff5252' }

function ScoreRing({ score }) {
  const color = SCORE_COLOR(score)
  const r = 38, c = 2 * Math.PI * r
  const dash = (score / 100) * c
  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#1e1e1e" strokeWidth="8" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
        transform="rotate(-90 50 50)" />
      <text x="50" y="54" textAnchor="middle" fill={color}
        style={{ fontSize: 22, fontWeight: 800, fontFamily: 'monospace' }}>
        {score}
      </text>
    </svg>
  )
}

function RoadmapTimeline({ items }) {
  const colores = { fundador: '#7c4dff', tech: '#00b0ff', marketing: '#00c853' }
  return (
    <div style={{ position: 'relative', paddingLeft: 28 }}>
      <div style={{ position: 'absolute', left: 10, top: 0, bottom: 0, width: 2, background: '#1e1e1e' }} />
      {items.map((item, i) => (
        <div key={i} style={{ position: 'relative', marginBottom: 20 }}>
          <div style={{
            position: 'absolute', left: -22, top: 4,
            width: 14, height: 14, borderRadius: '50%',
            background: colores[item.responsable] || '#555',
            border: '2px solid #0a0a0a',
          }} />
          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>
                Sem {item.semana} — {item.hito}
              </span>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#1a1a1a', color: colores[item.responsable] || '#555' }}>
                {item.responsable}
              </span>
            </div>
            <div style={{ color: '#666', fontSize: 12 }}>{item.descripcion}</div>
            {item.costo_estimado_usd && (
              <div style={{ color: '#ffd740', fontSize: 11, marginTop: 4 }}>
                USD {item.costo_estimado_usd.toLocaleString()}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function App() {
  const { user, token, loading: authLoading, email, signOut } = useAuth()

  const [vistaActual, setVistaActual] = useState('evaluar')
  const [idea, setIdea] = useState('')
  const [sector, setSector] = useState('')
  const [capital, setCapital] = useState('')
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [escenarios, setEscenarios] = useState(null)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('financiero')
  const [exportandoPDF, setExportandoPDF] = useState(false)

  // Mostrar spinner mientras Supabase verifica la sesión inicial
  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 24, height: 24, border: '2px solid #1e1e1e', borderTopColor: '#7c4dff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  // Si no hay usuario, mostrar pantalla de auth
  if (!user) return <AuthScreen />

  // ── Handlers ────────────────────────────────────────────────────────────────

  const evaluar = async () => {
    if (!idea.trim()) return
    setLoading(true)
    setError(null)
    setResultado(null)
    setEscenarios(null)
    try {
      const res = await fetch(`${API}/api/evaluar-completo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          idea, sector: sector || null,
          capital_disponible: capital ? parseFloat(capital) : null,
          plazo_meses: 12,
        }),
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      setResultado(data.resultado)
      setEscenarios(data.escenarios)
      setTab('financiero')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const exportarPDF = async () => {
    if (!resultado) return
    setExportandoPDF(true)
    try {
      const res = await fetch(`${API}/api/pdf-directo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultado, escenarios }),
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `incubadora-${resultado.idea_original.slice(0, 30).replace(/\s+/g, '-').toLowerCase()}.pdf`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError('Error generando PDF: ' + e.message)
    } finally {
      setExportandoPDF(false)
    }
  }

  const cargarDesdeHistorial = (resultadoGuardado, escenariosGuardados) => {
    setResultado(resultadoGuardado)
    setEscenarios(escenariosGuardados)
    setVistaActual('evaluar')
    setTab('financiero')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const TABS = [
    { key: 'financiero', label: '💰 Financiero' },
    { key: 'mercado',    label: '📊 Mercado' },
    { key: 'escenarios', label: '🌡 Escenarios' },
    { key: 'roadmap',    label: '🗓 Roadmap' },
  ]

  return (
    <div style={s.root}>
      {/* Header */}
      <header style={s.header}>
        <div style={s.logo}>
          <span style={{ color: '#7c4dff' }}>◈ </span>
          <span style={{ color: '#fff', fontWeight: 800 }}>incubadora</span>
          <span style={{ color: '#7c4dff', fontWeight: 800 }}>.ai</span>
        </div>

        {/* Nav */}
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { key: 'evaluar',   label: '◈ Evaluar' },
            { key: 'historial', label: '📋 Historial' },
          ].map(v => (
            <button key={v.key} onClick={() => setVistaActual(v.key)}
              style={{
                background: 'transparent',
                border: `1px solid ${vistaActual === v.key ? '#7c4dff' : '#1a1a1a'}`,
                color: vistaActual === v.key ? '#c4b5fd' : '#444',
                padding: '6px 16px', borderRadius: 8, cursor: 'pointer',
                fontSize: 13, fontFamily: 'inherit',
              }}>
              {v.label}
            </button>
          ))}
        </div>

        {/* Usuario */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#333', fontSize: 12 }}>{email}</span>
          <button onClick={signOut}
            style={{ background: 'transparent', border: '1px solid #1a1a1a', color: '#444', padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
            Salir
          </button>
        </div>
      </header>

      <main style={s.main}>

        {/* ── Vista: Evaluar ───────────────────────────────────────────────── */}
        {vistaActual === 'evaluar' && (
          <>
            <div style={s.card}>
              <div style={s.cardTitle}>¿Cuál es tu idea?</div>
              <textarea style={s.textarea} value={idea} onChange={e => setIdea(e.target.value)}
                placeholder="Describí tu idea de negocio. ¿A quién va dirigida? ¿Qué problema resuelve? ¿Cómo vas a ganar dinero?" rows={4} />
              <div style={s.inputRow}>
                <input style={s.inputSmall} value={sector} onChange={e => setSector(e.target.value)} placeholder="Sector (ej: tecnología, gastronomía)" />
                <input style={{ ...s.inputSmall, width: 180 }} value={capital} onChange={e => setCapital(e.target.value)} placeholder="Capital disponible USD" type="number" />
                <button style={{ ...s.btnEvaluar, ...(loading ? s.btnDisabled : {}) }} onClick={evaluar} disabled={loading || !idea.trim()}>
                  {loading ? '⟳ Evaluando...' : '◈ Evaluar idea'}
                </button>
              </div>
              {loading && (
                <div style={s.loadingBar}>
                  <div style={s.loadingText}>Agentes corriendo: financiero · mercado · escenarios · roadmap…</div>
                  <div style={s.progressTrack}><div style={{ ...s.progressFill, animation: 'progress 12s linear forwards' }} /></div>
                </div>
              )}
              {error && <div style={s.error}>⚠ {error}</div>}
            </div>

            {resultado && (
              <>
                {/* Score global */}
                <div style={s.card}>
                  <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <ScoreRing score={resultado.score_global} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: '#333', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Veredicto</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: SCORE_COLOR(resultado.score_global), marginBottom: 8 }}>{resultado.veredicto}</div>
                      <div style={{ color: '#777', fontSize: 13, lineHeight: 1.6 }}>{resultado.resumen_ejecutivo}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                      <button style={{ ...s.btnPDF, ...(exportandoPDF ? s.btnDisabled : {}) }} onClick={exportarPDF} disabled={exportandoPDF}>
                        {exportandoPDF ? '⟳ Generando...' : '📄 Exportar PDF'}
                      </button>
                      <div style={{ fontSize: 10, color: '#333' }}>Listo para presentar a inversores</div>
                    </div>
                  </div>
                  <div style={s.kpiGrid}>
                    {[
                      { label: 'ROI estimado',   value: `${resultado.financiero.roi_estimado_pct}%` },
                      { label: 'CAPEX inicial',   value: `USD ${resultado.financiero.capex_estimado_usd?.toLocaleString()}` },
                      { label: 'Prob. éxito',     value: `${resultado.mercado.probabilidad_exito_pct}%` },
                      { label: 'Payback',         value: `${resultado.financiero.payback_meses} meses` },
                      { label: 'Score mercado',   value: `${resultado.mercado.score_viabilidad}/100` },
                      { label: 'Riesgo',          value: resultado.financiero.riesgo?.toUpperCase(), color: RIESGO_COLOR[resultado.financiero.riesgo] },
                    ].map((kpi, i) => (
                      <div key={i} style={s.kpi}>
                        <div style={s.kpiLabel}>{kpi.label}</div>
                        <div style={{ ...s.kpiVal, color: kpi.color || '#fff' }}>{kpi.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tabs */}
                <div style={s.tabs}>
                  {TABS.map(t => (
                    <button key={t.key} style={{ ...s.tab, ...(tab === t.key ? s.tabActive : {}) }} onClick={() => setTab(t.key)}>
                      {t.label}
                      {t.key === 'escenarios' && <span style={s.tabBadge}>🇦🇷</span>}
                    </button>
                  ))}
                </div>

                {tab === 'financiero' && (
                  <div style={s.card}>
                    <div style={s.cardTitle}>Análisis financiero</div>
                    <div style={s.grid3}>
                      {[
                        { label: 'CAPEX estimado',     value: `USD ${resultado.financiero.capex_estimado_usd?.toLocaleString()}` },
                        { label: 'ROI esperado',        value: `${resultado.financiero.roi_estimado_pct}%` },
                        { label: 'Payback',             value: `${resultado.financiero.payback_meses} meses` },
                        { label: 'Margen bruto',        value: `${resultado.financiero.margen_bruto_pct}%` },
                        { label: 'Punto equilibrio',    value: `${resultado.financiero.punto_equilibrio_meses} meses` },
                        { label: 'Riesgo',              value: resultado.financiero.riesgo?.toUpperCase(), color: RIESGO_COLOR[resultado.financiero.riesgo] },
                      ].map((item, i) => (
                        <div key={i} style={s.statCard}>
                          <div style={s.statLabel}>{item.label}</div>
                          <div style={{ ...s.statVal, color: item.color || '#fff' }}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                    {resultado.financiero.notas && <div style={s.nota}><span style={{ color: '#7c4dff', marginRight: 8 }}>ℹ</span>{resultado.financiero.notas}</div>}
                  </div>
                )}

                {tab === 'mercado' && (
                  <div style={s.card}>
                    <div style={s.cardTitle}>Análisis de mercado</div>
                    <div style={s.grid3}>
                      {[
                        { label: 'Score viabilidad', value: `${resultado.mercado.score_viabilidad}/100` },
                        { label: 'TAM estimado',      value: resultado.mercado.tam_estimado },
                        { label: 'Prob. de éxito',    value: `${resultado.mercado.probabilidad_exito_pct}%` },
                      ].map((item, i) => (
                        <div key={i} style={s.statCard}>
                          <div style={s.statLabel}>{item.label}</div>
                          <div style={s.statVal}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                    {resultado.mercado.diferenciador_clave && <div style={{ ...s.nota, marginTop: 16 }}><span style={{ color: '#7c4dff', marginRight: 8 }}>◈</span><b>Diferenciador:</b> {resultado.mercado.diferenciador_clave}</div>}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 16 }}>
                      <div>
                        <div style={s.sectionLabel}>Competidores</div>
                        {resultado.mercado.competidores_principales?.map((c, i) => <div key={i} style={s.listItem}>· {c}</div>)}
                      </div>
                      <div>
                        <div style={s.sectionLabel}>⚠ Advertencias</div>
                        {resultado.mercado.advertencias?.map((a, i) => <div key={i} style={{ ...s.listItem, color: '#ff8a80' }}>· {a}</div>)}
                      </div>
                    </div>
                  </div>
                )}

                {tab === 'escenarios' && (
                  <div style={s.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                      <div style={s.cardTitle}>Simulación de escenarios inflacionarios</div>
                      <span style={{ fontSize: 11, color: '#7c4dff', background: 'rgba(124,77,255,0.1)', padding: '3px 10px', borderRadius: 20 }}>🇦🇷 Contexto argentino</span>
                    </div>
                    {escenarios ? <EscenariosPanel escenarios={escenarios} /> : <div style={{ color: '#444', fontSize: 13 }}>No disponible.</div>}
                  </div>
                )}

                {tab === 'roadmap' && (
                  <div style={s.card}>
                    <div style={s.cardTitle}>Plan de ejecución — 8 semanas al MVP</div>
                    <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                      {[{ color: '#7c4dff', label: 'Fundador' }, { color: '#00b0ff', label: 'Tech' }, { color: '#00c853', label: 'Marketing' }].map((l, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#666' }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: l.color }} />{l.label}
                        </div>
                      ))}
                    </div>
                    <RoadmapTimeline items={resultado.roadmap} />
                    {resultado.proximos_pasos?.length > 0 && (
                      <div style={{ marginTop: 24 }}>
                        <div style={s.sectionLabel}>Próximos pasos</div>
                        {resultado.proximos_pasos.map((paso, i) => <div key={i} style={{ ...s.listItem, color: '#00c853' }}>→ {paso}</div>)}
                      </div>
                    )}
                  </div>
                )}

                {/* Chat co-fundador */}
                <ChatCofundador resultado={resultado} escenarios={escenarios} apiUrl={API} />
              </>
            )}
          </>
        )}

        {/* ── Vista: Historial ─────────────────────────────────────────────── */}
        {vistaActual === 'historial' && (
          <div style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={s.cardTitle}>Mis evaluaciones</div>
              <span style={{ fontSize: 12, color: '#444' }}>Seleccioná 2 para comparar</span>
            </div>
            <HistorialPanel apiUrl={API} token={token} onCargar={cargarDesdeHistorial} />
          </div>
        )}

      </main>

      <style>{`
        @keyframes progress { from { width: 0% } to { width: 95% } }
        @keyframes spin { to { transform: rotate(360deg) } }
        * { box-sizing: border-box; margin: 0; padding: 0 }
        body { background: #0a0a0a }
        textarea:focus, input:focus { outline: none; border-color: #7c4dff !important }
        ::-webkit-scrollbar { width: 4px }
        ::-webkit-scrollbar-track { background: #111 }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px }
      `}</style>
    </div>
  )
}

const s = {
  root: { minHeight: '100vh', background: '#0a0a0a', color: '#ccc', fontFamily: "'Inter', system-ui, sans-serif" },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 32px', borderBottom: '1px solid #111', background: '#0d0d0d', position: 'sticky', top: 0, zIndex: 10 },
  logo: { fontSize: 20, letterSpacing: '-0.5px' },
  main: { maxWidth: 900, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 16 },
  card: { background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 14, padding: '24px' },
  cardTitle: { color: '#fff', fontWeight: 700, fontSize: 15, marginBottom: 18 },
  textarea: { width: '100%', background: '#111', border: '1px solid #1e1e1e', borderRadius: 10, color: '#ccc', fontSize: 14, lineHeight: 1.7, padding: '12px 16px', resize: 'vertical', fontFamily: 'inherit' },
  inputRow: { display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' },
  inputSmall: { flex: 1, background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, color: '#ccc', fontSize: 13, padding: '9px 12px', fontFamily: 'inherit', minWidth: 160 },
  btnEvaluar: { background: '#7c4dff', color: '#fff', border: 'none', padding: '9px 22px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' },
  btnPDF: { background: 'transparent', border: '1px solid #333', color: '#ccc', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13 },
  btnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  loadingBar: { marginTop: 16 },
  loadingText: { color: '#444', fontSize: 12, marginBottom: 8 },
  progressTrack: { height: 3, background: '#1a1a1a', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #7c4dff, #00c853)', borderRadius: 2, width: '0%' },
  error: { background: 'rgba(255,82,82,0.06)', border: '1px solid rgba(255,82,82,0.2)', color: '#ff8a80', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginTop: 12 },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginTop: 20 },
  kpi: { background: '#111', borderRadius: 8, padding: '10px 12px' },
  kpiLabel: { color: '#444', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 },
  kpiVal: { color: '#fff', fontSize: 15, fontWeight: 700 },
  tabs: { display: 'flex', gap: 4, flexWrap: 'wrap' },
  tab: { background: 'transparent', border: '1px solid #1a1a1a', color: '#555', padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 },
  tabActive: { borderColor: '#7c4dff', color: '#7c4dff', background: 'rgba(124,77,255,0.06)' },
  tabBadge: { fontSize: 12 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 },
  statCard: { background: '#111', borderRadius: 8, padding: '12px 14px' },
  statLabel: { color: '#444', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 },
  statVal: { color: '#fff', fontSize: 18, fontWeight: 700 },
  nota: { background: 'rgba(124,77,255,0.05)', border: '1px solid #1e1e1e', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#888', marginTop: 16 },
  sectionLabel: { color: '#333', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 },
  listItem: { fontSize: 13, color: '#666', lineHeight: 1.8 },
}
