import { useState, useRef, useEffect } from 'react'

const SUGERENCIAS_INIT = [
  '¿Cómo bajo el CAPEX inicial?',
  'Dame 3 variantes del modelo de negocio',
  '¿Qué pasa si arranco solo?',
  '¿Por dónde arranco mañana?',
]

function Msg({ msg }) {
  const esU = msg.role === 'user'
  return (
    <div style={{ display:'flex', justifyContent:esU?'flex-end':'flex-start', marginBottom:12 }}>
      {!esU && <div style={{ width:28, height:28, borderRadius:'50%', background:'rgba(124,77,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0, marginRight:8, marginTop:2 }}>◈</div>}
      <div style={{ maxWidth:'78%', background:esU?'rgba(124,77,255,0.12)':'#111', border:`1px solid ${esU?'rgba(124,77,255,0.25)':'#1e1e1e'}`, borderRadius:esU?'12px 12px 2px 12px':'12px 12px 12px 2px', padding:'10px 14px', fontSize:13, color:esU?'#c4b5fd':'#bbb', lineHeight:1.65, whiteSpace:'pre-wrap' }}>
        {msg.content}
        {msg.loading && <span style={{ display:'inline-flex', gap:3, marginLeft:6, verticalAlign:'middle' }}>
          {[0,1,2].map(i=><span key={i} style={{ width:5, height:5, borderRadius:'50%', background:'#7c4dff', animation:`bounce 1.2s ease-in-out ${i*0.2}s infinite` }}/>)}
        </span>}
      </div>
    </div>
  )
}

export default function ChatCofundador({ resultado, escenarios, apiUrl }) {
  const [historial, setHistorial] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sugerencias, setSugerencias] = useState(SUGERENCIAS_INIT)
  const [abierto, setAbierto] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [historial])

  useEffect(() => {
    if (abierto && historial.length === 0) {
      setHistorial([{ role:'assistant', content:`Hola. Revisé tu evaluación — ${resultado?.veredicto?.toLowerCase()||'lista'}.\n\n¿Qué querés mejorar o explorar?` }])
    }
  }, [abierto])

  const enviar = async (texto) => {
    const msg = texto || input.trim()
    if (!msg || loading) return
    setInput('')
    const nh = [...historial, { role:'user', content:msg }]
    setHistorial([...nh, { role:'assistant', content:'', loading:true }])
    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/api/chat`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ mensaje:msg, historial:nh.slice(-10).map(m=>({role:m.role,content:m.content})), resultado_evaluacion:resultado, escenarios }),
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      setHistorial(prev => [...prev.slice(0,-1), { role:'assistant', content:data.respuesta }])
      if (data.preguntas_sugeridas?.length) setSugerencias(data.preguntas_sugeridas)
    } catch (e) {
      setHistorial(prev => [...prev.slice(0,-1), { role:'assistant', content:`Error: ${e.message}` }])
    } finally {
      setLoading(false)
      setTimeout(()=>inputRef.current?.focus(),100)
    }
  }

  if (!abierto) return (
    <div onClick={()=>setAbierto(true)} style={{ background:'rgba(124,77,255,0.08)', border:'1px solid rgba(124,77,255,0.2)', borderRadius:12, padding:'14px 18px', cursor:'pointer', display:'flex', alignItems:'center', gap:12 }}>
      <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(124,77,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>◈</div>
      <div>
        <div style={{ color:'#c4b5fd', fontWeight:600, fontSize:13 }}>Hablar con el co-fundador IA</div>
        <div style={{ color:'#555', fontSize:12, marginTop:2 }}>"¿Cómo bajo el CAPEX?" · "Dame variantes" · "¿Por dónde arranco?"</div>
      </div>
      <div style={{ marginLeft:'auto', color:'#7c4dff', fontSize:18 }}>→</div>
    </div>
  )

  return (
    <div style={{ background:'#0d0d0d', border:'1px solid #1a1a1a', borderRadius:14, overflow:'hidden', display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 18px', borderBottom:'1px solid #1a1a1a', background:'#111' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:'50%', background:'rgba(124,77,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>◈</div>
          <div>
            <div style={{ color:'#fff', fontWeight:600, fontSize:13 }}>Co-fundador IA</div>
            <div style={{ color:'#444', fontSize:11 }}>Contexto: {resultado?.idea_original?.slice(0,40)}...</div>
          </div>
        </div>
        <button onClick={()=>setAbierto(false)} style={{ background:'transparent', border:'none', color:'#444', cursor:'pointer', fontSize:18 }}>✕</button>
      </div>
      <div style={{ height:360, overflowY:'auto', padding:'16px 16px 8px' }}>
        {historial.map((msg,i) => <Msg key={i} msg={msg} />)}
        <div ref={bottomRef}/>
      </div>
      {!loading && (
        <div style={{ padding:'0 16px 10px', display:'flex', gap:6, flexWrap:'wrap' }}>
          {sugerencias.map((s,i) => (
            <button key={i} onClick={()=>enviar(s)} style={{ background:'transparent', border:'1px solid #1e1e1e', color:'#555', padding:'5px 10px', borderRadius:20, cursor:'pointer', fontSize:11, fontFamily:'inherit' }}>
              {s}
            </button>
          ))}
        </div>
      )}
      <div style={{ padding:'10px 14px 14px', borderTop:'1px solid #111', display:'flex', gap:8, alignItems:'flex-end' }}>
        <textarea ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();enviar()} }}
          placeholder="Preguntá algo sobre tu negocio… (Enter para enviar)"
          disabled={loading} rows={1}
          style={{ flex:1, background:'#111', border:'1px solid #1e1e1e', borderRadius:10, color:'#ccc', fontSize:13, padding:'10px 12px', resize:'none', fontFamily:'inherit', lineHeight:1.5 }}
          onInput={e=>{e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,100)+'px'}}
        />
        <button onClick={()=>enviar()} disabled={loading||!input.trim()}
          style={{ background:loading||!input.trim()?'#1a1a1a':'#7c4dff', border:'none', color:loading||!input.trim()?'#333':'#fff', width:38, height:38, borderRadius:10, cursor:loading||!input.trim()?'not-allowed':'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          {loading?'⟳':'↑'}
        </button>
      </div>
      <style>{`@keyframes bounce{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}`}</style>
    </div>
  )
}
