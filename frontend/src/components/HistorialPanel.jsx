import { useState, useEffect } from 'react'

const SC = (s) => s>=70?'#00c853':s>=50?'#ffd740':'#ff5252'
const SB = (s) => s>=70?'rgba(0,200,83,0.08)':s>=50?'rgba(255,215,64,0.08)':'rgba(255,82,82,0.08)'
const VC = { 'Viable':'#00c853', 'Viable con ajustes':'#ffd740', 'No viable':'#ff5252' }

function DeltaBadge({ delta }) {
  if (!delta || delta.diff === null) return <span style={{ color:'#333' }}>—</span>
  const color = delta.mejor ? '#00c853' : delta.diff===0 ? '#555' : '#ff5252'
  const icono = delta.mejor ? '↑' : delta.diff===0 ? '→' : '↓'
  const signo = delta.diff > 0 ? '+' : ''
  return <span style={{ color, fontSize:11, fontWeight:600 }}>{icono} {signo}{delta.diff} ({signo}{delta.pct}%)</span>
}

export default function HistorialPanel({ apiUrl, token, onCargar }) {
  const [evaluaciones, setEvaluaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [seleccionadas, setSeleccionadas] = useState([])
  const [comparacion, setComparacion] = useState(null)
  const [comparando, setComparando] = useState(false)
  const [cargandoId, setCargandoId] = useState(null)

  useEffect(() => { cargar() }, [token])

  const cargar = async () => {
    if (!token) { setLoading(false); return }
    try {
      const res = await fetch(`${apiUrl}/api/historial`, { headers:{ Authorization:`Bearer ${token}` } })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      setEvaluaciones(await res.json())
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const toggleSel = (id) => {
    setSeleccionadas(prev => prev.includes(id) ? prev.filter(x=>x!==id) : prev.length<2 ? [...prev,id] : [prev[1],id])
    setComparacion(null)
  }

  const comparar = async () => {
    if (seleccionadas.length!==2) return
    setComparando(true)
    try {
      const res = await fetch(`${apiUrl}/api/historial/comparar`, {
        method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
        body: JSON.stringify({ eval_id_a:seleccionadas[0], eval_id_b:seleccionadas[1] }),
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      setComparacion(await res.json())
    } catch(e) { setError(e.message) }
    finally { setComparando(false) }
  }

  const cargarEval = async (id) => {
    setCargandoId(id)
    try {
      const res = await fetch(`${apiUrl}/api/historial/${id}`, { headers:{ Authorization:`Bearer ${token}` } })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const j = data.resultado_json
      onCargar(j, j.escenarios||null)
    } catch(e) { setError(e.message) }
    finally { setCargandoId(null) }
  }

  const eliminar = async (id, e) => {
    e.stopPropagation()
    if (!confirm('¿Eliminar esta evaluación?')) return
    await fetch(`${apiUrl}/api/historial/${id}`, { method:'DELETE', headers:{ Authorization:`Bearer ${token}` } })
    setEvaluaciones(prev => prev.filter(ev=>ev.id!==id))
    setSeleccionadas(prev => prev.filter(x=>x!==id))
  }

  if (!token) return <div style={s.empty}>Iniciá sesión para ver tu historial.</div>
  if (loading) return <div style={s.empty}>Cargando historial…</div>
  if (error) return <div style={{ ...s.empty, color:'#ff8a80' }}>⚠ {error}</div>
  if (!evaluaciones.length) return (
    <div style={s.empty}>
      <div style={{ fontSize:32, marginBottom:12 }}>◈</div>
      <div style={{ color:'#fff', fontWeight:600, marginBottom:6 }}>Sin evaluaciones todavía</div>
      <div style={{ color:'#444', fontSize:13 }}>Evaluá tu primera idea para verla acá.</div>
    </div>
  )

  const METRICAS = [
    { key:'score_global', label:'Score global', suf:'/100' },
    { key:'roi_estimado_pct', label:'ROI estimado', suf:'%' },
    { key:'capex_estimado_usd', label:'CAPEX', pre:'USD ', dec:0, hib:false },
    { key:'payback_meses', label:'Payback', suf:' meses', hib:false },
    { key:'margen_bruto_pct', label:'Margen bruto', suf:'%' },
    { key:'score_viabilidad', label:'Score mercado', suf:'/100' },
    { key:'probabilidad_exito_pct', label:'Prob. éxito', suf:'%' },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
        <div style={{ fontSize:13, color:'#555' }}>
          {evaluaciones.length} evaluación{evaluaciones.length!==1?'es':''} guardada{evaluaciones.length!==1?'s':''}
          {seleccionadas.length>0 && <span style={{ color:'#7c4dff', marginLeft:8 }}>· {seleccionadas.length} seleccionada{seleccionadas.length!==1?'s':''}</span>}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {seleccionadas.length>0 && <button onClick={()=>{setSeleccionadas([]);setComparacion(null)}} style={s.btnSec}>Limpiar</button>}
          <button onClick={comparar} disabled={seleccionadas.length!==2||comparando}
            style={{ ...s.btnComp, ...(seleccionadas.length!==2?s.dis:{}) }}>
            {comparando?'⟳ Comparando...':'⇄ Comparar'}
          </button>
        </div>
      </div>

      {seleccionadas.length < 2 && (
        <div style={{ fontSize:12, color:'#333', padding:'8px 12px', background:'#111', borderRadius:8, border:'1px solid #1a1a1a' }}>
          Seleccioná 2 evaluaciones para ver cómo mejoró tu modelo entre iteraciones.
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {evaluaciones.map((ev) => {
          const sel = seleccionadas.includes(ev.id)
          const idx = seleccionadas.indexOf(ev.id)
          return (
            <div key={ev.id} onClick={()=>toggleSel(ev.id)}
              style={{ background:sel?'rgba(124,77,255,0.06)':'#0d0d0d', border:`1px solid ${sel?'rgba(124,77,255,0.3)':'#1a1a1a'}`, borderRadius:12, padding:'14px 16px', cursor:'pointer', display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:22, height:22, borderRadius:'50%', flexShrink:0, background:sel?'#7c4dff':'#111', border:`2px solid ${sel?'#7c4dff':'#2a2a2a'}`, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:11, fontWeight:700 }}>
                {sel?(idx===0?'A':'B'):''}
              </div>
              <div style={{ width:44, height:44, borderRadius:10, flexShrink:0, background:SB(ev.score_global||0), display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:800, color:SC(ev.score_global||0) }}>
                {ev.score_global}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ color:'#fff', fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.idea_original}</div>
                <div style={{ display:'flex', gap:10, marginTop:4, flexWrap:'wrap' }}>
                  <span style={{ fontSize:11, color:VC[ev.veredicto]||'#888' }}>{ev.veredicto}</span>
                  {ev.roi_estimado_pct && <span style={{ fontSize:11, color:'#555' }}>ROI {ev.roi_estimado_pct}%</span>}
                  {ev.capex_estimado_usd && <span style={{ fontSize:11, color:'#555' }}>CAPEX USD {Number(ev.capex_estimado_usd).toLocaleString()}</span>}
                  <span style={{ fontSize:11, color:'#333' }}>{new Date(ev.created_at).toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'2-digit'})}</span>
                </div>
              </div>
              <div style={{ display:'flex', gap:6, flexShrink:0 }} onClick={e=>e.stopPropagation()}>
                <button onClick={()=>cargarEval(ev.id)} style={s.btnAcc} title="Cargar en dashboard">{cargandoId===ev.id?'⟳':'↗'}</button>
                <button onClick={(e)=>eliminar(ev.id,e)} style={{ ...s.btnAcc, color:'#ff5252' }} title="Eliminar">✕</button>
              </div>
            </div>
          )
        })}
      </div>

      {comparacion && (
        <div style={{ background:'#0d0d0d', border:'1px solid #1a1a1a', borderRadius:14, overflow:'hidden' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 18px', borderBottom:'1px solid #1a1a1a', background:'#111' }}>
            <div style={{ color:'#fff', fontWeight:600, fontSize:14 }}>Comparación A vs B</div>
            <button onClick={()=>setComparacion(null)} style={{ background:'transparent', border:'none', color:'#444', cursor:'pointer', fontSize:18 }}>✕</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', borderBottom:'1px solid #1a1a1a' }}>
            {[comparacion.eval_a, comparacion.eval_b].map((ev,i) => (
              <div key={i} style={{ padding:'14px 18px', borderRight:i===0?'1px solid #1a1a1a':'none' }}>
                <div style={{ fontSize:10, color:'#444', textTransform:'uppercase', marginBottom:4 }}>{i===0?'Versión A':'Versión B'}</div>
                <div style={{ fontSize:12, color:'#888' }}>{ev.idea}</div>
                <div style={{ fontSize:10, color:'#333', marginTop:4 }}>{new Date(ev.fecha).toLocaleDateString('es-AR')}</div>
              </div>
            ))}
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ borderBottom:'1px solid #1a1a1a' }}>
                {['Métrica','Versión A','Versión B','Cambio'].map(h=>(
                  <th key={h} style={{ padding:'8px 12px', textAlign:'left', color:'#444', fontWeight:500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METRICAS.map((m,idx) => {
                const d = comparacion.metricas[m.key]
                const fv = (v) => v!=null ? `${m.pre||''}${m.dec!==undefined?Number(v).toLocaleString('es-AR',{maximumFractionDigits:m.dec}):v}${m.suf||''}` : '—'
                return (
                  <tr key={m.key} style={{ borderBottom:'1px solid #111', background:idx%2===0?'transparent':'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding:'8px 12px', color:'#555' }}>{m.label}</td>
                    <td style={{ padding:'8px 12px', color:'#777' }}>{fv(d?.valor_a)}</td>
                    <td style={{ padding:'8px 12px', color:'#fff', fontWeight:500 }}>{fv(d?.valor_b)}</td>
                    <td style={{ padding:'8px 12px' }}><DeltaBadge delta={d}/></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div style={{ padding:'14px 18px', background:comparacion.veredictos.mejoro?'rgba(0,200,83,0.05)':'rgba(255,82,82,0.05)', borderTop:'1px solid #1a1a1a', display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:18 }}>{comparacion.veredictos.mejoro?'🚀':'📉'}</span>
            <span style={{ fontSize:13, color:comparacion.veredictos.mejoro?'#00c853':'#ff8a80' }}>
              {comparacion.veredictos.mejoro ? 'El modelo mejoró. Seguí refinando.' : 'El modelo empeoró. Revisá los cambios.'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  empty: { padding:'48px 24px', textAlign:'center', color:'#333', fontSize:14 },
  btnComp: { background:'#7c4dff', color:'#fff', border:'none', padding:'8px 16px', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'inherit' },
  btnSec: { background:'transparent', color:'#555', border:'1px solid #2a2a2a', padding:'7px 14px', borderRadius:8, cursor:'pointer', fontSize:13, fontFamily:'inherit' },
  dis: { opacity:0.4, cursor:'not-allowed' },
  btnAcc: { background:'transparent', border:'1px solid #1e1e1e', color:'#555', width:30, height:30, borderRadius:8, cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'inherit' },
}
