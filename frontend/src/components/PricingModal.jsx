// ── MercadoPago ───────────────────────────────────────────────────────────────
// Agregá esto en server.js después del import de plans.js

import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'

const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN })

const MP_PLANES = {
  pro: {
    title: 'Incubadora AI — Plan Pro',
    unit_price: 15,
    currency_id: 'USD',
  },
  elite: {
    title: 'Incubadora AI — Plan Elite',
    unit_price: 49,
    currency_id: 'USD',
  },
}

// ── Crear preferencia de pago ─────────────────────────────────────────────────
app.post('/api/mp/crear-preferencia', async (req, res) => {
  const userId = getUserId(req)
  if (!userId) return res.status(401).json({ error: 'No autenticado' })

  const { plan } = req.body
  if (!MP_PLANES[plan]) return res.status(400).json({ error: 'Plan inválido' })

  const planData = MP_PLANES[plan]
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'

  try {
    const preference = new Preference(mp)
    const result = await preference.create({
      body: {
        items: [{
          title: planData.title,
          quantity: 1,
          unit_price: planData.unit_price,
          currency_id: planData.currency_id,
        }],
        payer: { email: req.body.email || '' },
        back_urls: {
          success: `${frontendUrl}/pago-exitoso?plan=${plan}&userId=${userId}`,
          failure: `${frontendUrl}/pago-fallido`,
          pending: `${frontendUrl}/pago-pendiente`,
        },
        auto_return: 'approved',
        external_reference: `${userId}|${plan}`,
        notification_url: `${process.env.BACKEND_URL}/api/mp/webhook`,
      }
    })

    res.json({
      preference_id: result.id,
      init_point: result.init_point,      // URL de pago producción
      sandbox_init_point: result.sandbox_init_point, // URL de pago sandbox
    })
  } catch (e) {
    console.error('[MP] Error creando preferencia:', e)
    res.status(500).json({ error: e.message })
  }
})

// ── Webhook de MercadoPago ────────────────────────────────────────────────────
app.post('/api/mp/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const { type, data } = req.body

  if (type !== 'payment') return res.sendStatus(200)

  try {
    const payment = new Payment(mp)
    const pago = await payment.get({ id: data.id })

    console.log('[MP] Pago recibido:', {
      id: pago.id,
      status: pago.status,
      external_reference: pago.external_reference,
    })

    if (pago.status !== 'approved') return res.sendStatus(200)

    // external_reference = "userId|plan"
    const [userId, plan] = (pago.external_reference || '').split('|')
    if (!userId || !plan) return res.sendStatus(200)

    // Calcular vencimiento (1 mes)
    const vence = new Date()
    vence.setMonth(vence.getMonth() + 1)

    // Guardar en Supabase
    const { error } = await supabase
      .from('suscripciones')
      .upsert({
        user_id: userId,
        plan,
        status: 'active',
        mp_payment_id: String(pago.id),
        mp_external_reference: pago.external_reference,
        vence_en: vence.toISOString(),
        actualizado_en: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (error) console.error('[MP] Error guardando suscripción:', error)
    else console.log(`[MP] ✓ Plan ${plan} activado para usuario ${userId}`)

    res.sendStatus(200)
  } catch (e) {
    console.error('[MP] Error procesando webhook:', e)
    res.sendStatus(500)
  }
})

// ── Estado de suscripción ─────────────────────────────────────────────────────
app.get('/api/mp/suscripcion', async (req, res) => {
  const userId = getUserId(req)
  if (!userId) return res.status(401).json({ error: 'No autenticado' })

  try {
    const { data } = await supabase
      .from('suscripciones')
      .select('plan, status, vence_en, actualizado_en')
      .eq('user_id', userId)
      .single()

    if (!data) return res.json({ plan: 'free', status: 'none' })

    // Verificar si venció
    const vencido = data.vence_en && new Date(data.vence_en) < new Date()
    if (vencido && data.status === 'active') {
      await supabase
        .from('suscripciones')
        .update({ status: 'expired' })
        .eq('user_id', userId)
      return res.json({ plan: 'free', status: 'expired' })
    }

    res.json(data)
  } catch {
    res.json({ plan: 'free', status: 'none' })
  }
})

// ── Cancelar suscripción ──────────────────────────────────────────────────────
app.post('/api/mp/cancelar', async (req, res) => {
  const userId = getUserId(req)
  if (!userId) return res.status(401).json({ error: 'No autenticado' })

  try {
    await supabase
      .from('suscripciones')
      .update({ status: 'cancelled', actualizado_en: new Date().toISOString() })
      .eq('user_id', userId)

    res.json({ ok: true, mensaje: 'Suscripción cancelada. Podés seguir usando el plan hasta que venza.' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})