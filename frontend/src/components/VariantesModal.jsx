import { useState } from 'react'

export default function VariantesModal({ resultado, apiUrl, token, onClose }) {
  const [variantes, setVariantes] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const generar = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${apiUrl}/api/variantes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ resultado }),
      })
      if (!res.ok) {
        const data = await res.json()
        if (data.error === 'plan_requerido') throw new Error('plan_requerido')
        throw new Error(data.error || `Error ${res.status}`)
      }
      const data = await res.json()
      setVariantes(data.variantes || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <div>
            <div style={s.title}>🔄 Variantes del modelo de negocio</div>
            <div style={s.sub}>3 alternativas viables basadas en tu idea original</div>
          </div>
          <button onClick={onClose} style={s.closeBtn}>✕</button>
        </div>

        <div style={s.body}>
          {!variantes && !loading && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔄</div>
              <div style={{ color: '#fff', fontWeight: 600, marginBottom: 8 }}>
                Generamos 3 variantes de tu modelo
              </div>
              <div style={{ color: '#555', fontSize: 13, marginBottom: 24 }}>
                Una conservadora, una intermedia y una agresiva — todas viables para Argentina
              </div>
              <button onClick={generar} style={s.btnGenerar}>
                ◈ Generar variantes
              </button>
            </div>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ color: '#7c4dff', fontSize: 14 }}>⟳ Analizando variantes del modelo…</div>
            </div>
          )}

          {error === 'plan_requerido' && (
            <div style={s.errorPlan}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>🔒</div>
              <div style={{ color: '#fff', fontWeight: 600, marginBottom: 4 }}>Requiere Plan Pro</div>
              <div style={{ color: '#666', fontSize: 13 }}>Las variantes del modelo están disponibles desde el Plan Pro.</div>
            </div>
          )}

          {error && error !== 'plan_requerido' && (
            <div style={s.error}>⚠ {error}</div>
          )}

          {variantes && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {variantes.map((v, i) => (
                <div key={i} style={s.varianteCard}>
                  <div style={s.varianteHeader}>
                    <span style={s.varianteNombre}>{v.nombre}</span>
                    <div style={s.varianteKpis}>
                      <span style={s.kpi}>CAPEX USD {(v.capex_estimado_usd || 0).toLocaleString()}</span>
                      <span style={s.kpi}>ROI {v.roi_estimado_pct || 0}%</span>
                    </div>
                  </div>
                  <div style={s.varianteDesc}>{v.descripcion}</div>
                  <div style={s.cambio}>
                    <span style={{ color: '#7c4dff', marginRight: 6 }}>◈ Cambio clave:</span>
                    {v.cambio_clave}
                  </div>
                  <div style={s.porQue}>
                    <span style={{ color: '#00c853', marginRight: 6 }}>✓ Por qué funciona:</span>
                    {v.por_que_funciona}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
  modal: { background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 16, width: '100%', maxWidth: 680, maxHeight: '85vh', display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 24px 16px', borderBottom: '1px solid #1a1a1a', flexShrink: 0 },
  title: { color: '#fff', fontWeight: 700, fontSize: 16 },
  sub: { color: '#444', fontSize: 13, marginTop: 3 },
  closeBtn: { background: 'transparent', border: 'none', color: '#444', fontSize: 18, cursor: 'pointer' },
  body: { padding: '20px 24px', overflowY: 'auto', flex: 1 },
  btnGenerar: { background: '#7c4dff', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14, fontFamily: 'inherit' },
  errorPlan: { textAlign: 'center', padding: '32px 0', color: '#888' },
  error: { background: 'rgba(255,82,82,0.06)', border: '1px solid rgba(255,82,82,0.2)', color: '#ff8a80', padding: '10px 14px', borderRadius: 8, fontSize: 13 },
  varianteCard: { background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: '16px 18px' },
  varianteHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  varianteNombre: { color: '#fff', fontWeight: 700, fontSize: 14 },
  varianteKpis: { display: 'flex', gap: 8 },
  kpi: { background: '#1a1a1a', color: '#888', padding: '3px 10px', borderRadius: 20, fontSize: 11 },
  varianteDesc: { color: '#888', fontSize: 13, lineHeight: 1.6, marginBottom: 10 },
  cambio: { fontSize: 13, color: '#bbb', marginBottom: 6 },
  porQue: { fontSize: 13, color: '#bbb' },
}