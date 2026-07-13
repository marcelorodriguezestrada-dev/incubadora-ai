import { useState } from 'react'

const PLANES = [
  {
    key: 'free',
    nombre: 'Free',
    precio: '$0',
    periodo: 'siempre',
    color: '#666',
    border: '#2a2a2a',
    features: [
      '3 evaluaciones por mes',
      'Análisis financiero básico',
      '3 escenarios inflacionarios',
      'Roadmap de 8 semanas',
    ],
    noIncluye: [
      'Historial de evaluaciones',
      'Exportar PDF',
      'Chat co-fundador IA',
      'Variantes del modelo',
      'Seguimiento semanal',
    ],
    cta: 'Plan actual',
    disabled: true,
  },
  {
    key: 'pro',
    nombre: 'Pro',
    precio: 'USD 15',
    periodo: '/mes',
    color: '#7c4dff',
    border: '#7c4dff',
    badge: '⭐ Más popular',
    features: [
      'Evaluaciones ilimitadas',
      'Historial + comparativa',
      'Exportar PDF ejecutivo',
      'Chat co-fundador IA',
      '3 variantes del modelo',
      'Análisis detallado',
    ],
    noIncluye: [
      'Seguimiento semanal',
      'Alertas por Telegram',
    ],
    cta: 'Empezar Pro',
    disabled: false,
  },
  {
    key: 'elite',
    nombre: 'Elite',
    precio: 'USD 49',
    periodo: '/mes',
    color: '#00c853',
    border: '#00c853',
    badge: '🚀 Acelerador',
    features: [
      'Todo lo de Pro',
      'Seguimiento semanal del roadmap',
      'Alertas por Telegram',
      'Benchmark contra otras ideas',
      'Recursos curados por industria',
      'Soporte prioritario',
    ],
    noIncluye: [],
    cta: 'Empezar Elite',
    disabled: false,
  },
]

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function PricingModal({ onClose, planActual = 'free', trigger = null, token, email }) {
  const [loadingPlan, setLoadingPlan] = useState(null)
  const [error, setError] = useState(null)

  const handlePagar = async (planKey) => {
    if (!token) { setError('Necesitás estar logueado para suscribirte.'); return }
    setLoadingPlan(planKey)
    setError(null)

    try {
      const res = await fetch(`${API}/api/mp/crear-preferencia`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: planKey, email }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error creando preferencia')

      // Redirigir al checkout de MercadoPago
      // En producción: data.init_point
      // En sandbox/testing: data.sandbox_init_point
      const url = process.env.NODE_ENV === 'production'
        ? data.init_point
        : data.sandbox_init_point

      window.location.href = url
    } catch (e) {
      setError(e.message)
      setLoadingPlan(null)
    }
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={s.header}>
          <div>
            {trigger === 'limite' && (
              <div style={s.triggerBadge}>⚠ Alcanzaste el límite del plan Free</div>
            )}
            {trigger === 'feature' && (
              <div style={s.triggerBadge}>🔒 Esta función requiere un plan pago</div>
            )}
            {trigger === 'no_viable' && (
              <div style={{ ...s.triggerBadge, background: 'rgba(255,82,82,0.1)', borderColor: 'rgba(255,82,82,0.3)', color: '#ff8a80' }}>
                💡 Tu idea necesita ajustes — con Pro generamos 3 variantes que sí funcionan
              </div>
            )}
            <div style={s.title}>Elegí tu plan</div>
            <div style={s.subtitle}>Cancelás cuando quieras · Sin compromisos</div>
          </div>
          <button onClick={onClose} style={s.closeBtn}>✕</button>
        </div>

        {error && (
          <div style={{ margin: '0 28px', background: 'rgba(255,82,82,0.08)', border: '1px solid rgba(255,82,82,0.2)', color: '#ff8a80', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>
            ⚠ {error}
          </div>
        )}

        {/* Planes */}
        <div style={s.planesGrid}>
          {PLANES.map(plan => (
            <div key={plan.key} style={{
              ...s.planCard,
              borderColor: planActual === plan.key ? plan.color : plan.border,
              background: planActual === plan.key ? `${plan.color}08` : '#111',
            }}>
              {plan.badge && (
                <div style={{ ...s.badge, color: plan.color, borderColor: `${plan.color}44`, background: `${plan.color}11` }}>
                  {plan.badge}
                </div>
              )}
              {planActual === plan.key && (
                <div style={{ ...s.badge, color: '#666', borderColor: '#2a2a2a', background: '#1a1a1a' }}>
                  Plan actual
                </div>
              )}

              <div style={s.planNombre}>{plan.nombre}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 20 }}>
                <span style={{ ...s.planPrecio, color: plan.color }}>{plan.precio}</span>
                <span style={s.planPeriodo}>{plan.periodo}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20, flex: 1 }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <span style={{ color: plan.color, fontSize: 14 }}>✓</span>
                    <span style={{ color: '#bbb' }}>{f}</span>
                  </div>
                ))}
                {plan.noIncluye.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <span style={{ color: '#333', fontSize: 14 }}>✕</span>
                    <span style={{ color: '#444' }}>{f}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => !plan.disabled && planActual !== plan.key && handlePagar(plan.key)}
                disabled={plan.disabled || planActual === plan.key || loadingPlan === plan.key}
                style={{
                  width: '100%',
                  padding: '11px',
                  borderRadius: 8,
                  border: `1px solid ${plan.color}`,
                  background: plan.disabled || planActual === plan.key ? 'transparent' : plan.color,
                  color: plan.disabled || planActual === plan.key ? plan.color : plan.key === 'pro' ? '#fff' : '#000',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: plan.disabled || planActual === plan.key ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                  opacity: plan.disabled || planActual === plan.key ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {loadingPlan === plan.key
                  ? '⟳ Redirigiendo...'
                  : planActual === plan.key
                  ? '✓ Plan actual'
                  : plan.cta}
              </button>
            </div>
          ))}
        </div>

        <div style={s.footer}>
          <img src="https://http2.mlstatic.com/frontend-assets/mp-web-navigation/ui-navigation/5.21.22/mercadopago/logo__large@2x.png" alt="MercadoPago" style={{ height: 18, opacity: 0.4 }} />
          <span>Pagos seguros con MercadoPago · Cancelás cuando quieras · Precios en USD</span>
        </div>
      </div>
    </div>
  )
}

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
  modal: { background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 16, width: '100%', maxWidth: 860, maxHeight: '90vh', overflow: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px 28px 20px', borderBottom: '1px solid #1a1a1a' },
  triggerBadge: { background: 'rgba(124,77,255,0.1)', border: '1px solid rgba(124,77,255,0.3)', color: '#c4b5fd', padding: '6px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 },
  title: { color: '#fff', fontWeight: 800, fontSize: 20, marginBottom: 4 },
  subtitle: { color: '#444', fontSize: 13 },
  closeBtn: { background: 'transparent', border: 'none', color: '#444', fontSize: 20, cursor: 'pointer' },
  planesGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, padding: '24px 28px' },
  planCard: { border: '1px solid', borderRadius: 12, padding: '20px 18px', display: 'flex', flexDirection: 'column' },
  badge: { fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, border: '1px solid', width: 'fit-content', marginBottom: 12 },
  planNombre: { color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 6 },
  planPrecio: { fontSize: 26, fontWeight: 800 },
  planPeriodo: { color: '#555', fontSize: 13 },
  footer: { padding: '16px 28px', borderTop: '1px solid #1a1a1a', color: '#333', fontSize: 12, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 },
}