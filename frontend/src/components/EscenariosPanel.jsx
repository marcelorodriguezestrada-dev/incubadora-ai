const CFG = {
  Optimista: { color:'#00c853', bg:'rgba(0,200,83,0.06)',  border:'rgba(0,200,83,0.2)',  icon:'📈' },
  Base:      { color:'#ffd740', bg:'rgba(255,215,64,0.06)', border:'rgba(255,215,64,0.2)', icon:'📊' },
  Pesimista: { color:'#ff5252', bg:'rgba(255,82,82,0.06)',  border:'rgba(255,82,82,0.2)',  icon:'📉' },
}

export default function EscenariosPanel({ escenarios }) {
  if (!escenarios?.escenarios?.length) return null
  const maxROI = Math.max(...escenarios.escenarios.map(e => Math.abs(e.roi_ajustado_pct)), 1)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
        {escenarios.escenarios.map((esc) => {
          const c = CFG[esc.nombre] || CFG.Base
          return (
            <div key={esc.nombre} style={{ background:c.bg, border:`1px solid ${c.border}`, borderRadius:12, padding:'18px 16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
                <span style={{ color:c.color, fontWeight:700, fontSize:13 }}>{c.icon} {esc.nombre}</span>
                <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:esc.sobrevive?'rgba(0,200,83,0.15)':'rgba(255,82,82,0.15)', color:esc.sobrevive?'#00c853':'#ff5252', fontWeight:600 }}>
                  {esc.sobrevive ? '✓ Sobrevive' : '✗ Colapsa'}
                </span>
              </div>
              {[
                ['Inflación', `${esc.inflacion_anual_pct}%`],
                ['Devaluación', `${esc.tipo_cambio_devaluacion_pct}%`],
                ['ROI ajustado', `${esc.roi_ajustado_pct}%`, esc.roi_ajustado_pct>=0?'#00c853':'#ff5252'],
                ['Payback', `${esc.payback_ajustado_meses} meses`],
                ['Margen real', `${esc.margen_real_pct}%`, esc.margen_real_pct>=20?'#00c853':esc.margen_real_pct>=10?'#ffd740':'#ff5252'],
              ].map(([label,val,color],i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                  <span style={{ fontSize:11, color:'#555' }}>{label}</span>
                  <span style={{ fontSize:12, fontWeight:600, color:color||'#ccc' }}>{val}</span>
                </div>
              ))}
              {esc.advertencia && <div style={{ marginTop:10, padding:'8px 10px', borderRadius:6, background:'rgba(0,0,0,0.2)', fontSize:11, color:'#888', lineHeight:1.5 }}>{esc.advertencia}</div>}
            </div>
          )
        })}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {escenarios.recomendacion && (
          <div style={{ background:'rgba(124,77,255,0.05)', border:'1px solid rgba(124,77,255,0.15)', borderRadius:10, padding:'14px 16px' }}>
            <div style={{ fontSize:11, color:'#7c4dff', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Recomendación</div>
            <div style={{ fontSize:13, color:'#888', lineHeight:1.6 }}>{escenarios.recomendacion}</div>
          </div>
        )}
        {escenarios.cobertura_sugerida && (
          <div style={{ background:'rgba(0,200,83,0.04)', border:'1px solid rgba(0,200,83,0.15)', borderRadius:10, padding:'14px 16px' }}>
            <div style={{ fontSize:11, color:'#00c853', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Cobertura sugerida</div>
            <div style={{ fontSize:13, color:'#888', lineHeight:1.6 }}>{escenarios.cobertura_sugerida}</div>
          </div>
        )}
      </div>
    </div>
  )
}
