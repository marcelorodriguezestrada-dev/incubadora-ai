export const PLANES = {
  free: {
    nombre: 'Free',
    precio_usd: 0,
    evaluaciones_mes: 3,
    historial: false,
    pdf: false,
    chat: false,
    comparativa: false,
    variantes_modelo: false,
    seguimiento: false,
    alertas_telegram: false,
  },
  pro: {
    nombre: 'Pro',
    precio_usd: 15,
    evaluaciones_mes: Infinity,
    historial: true,
    pdf: true,
    chat: true,
    comparativa: true,
    variantes_modelo: true,
    seguimiento: false,
    alertas_telegram: false,
  },
  elite: {
    nombre: 'Elite',
    precio_usd: 49,
    evaluaciones_mes: Infinity,
    historial: true,
    pdf: true,
    chat: true,
    comparativa: true,
    variantes_modelo: true,
    seguimiento: true,
    alertas_telegram: true,
  },
}

export async function getPlan(supabase, userId) {
  if (!userId) return 'free'
  try {
    const { data } = await supabase
      .from('suscripciones')
      .select('plan, status')
      .eq('user_id', userId)
      .single()
    if (data?.status === 'active') return data.plan
    return 'free'
  } catch {
    return 'free'
  }
}

export async function puedeEvaluar(supabase, userId) {
  const plan = await getPlan(supabase, userId)
  if (PLANES[plan].evaluaciones_mes === Infinity) return { puede: true, plan, restantes: Infinity }

  const mes = new Date().toISOString().slice(0, 7) // "2025-01"
  try {
    const { data } = await supabase
      .from('uso_mensual')
      .select('evaluaciones')
      .eq('user_id', userId)
      .eq('mes', mes)
      .single()
    const usadas = data?.evaluaciones || 0
    const limite = PLANES[plan].evaluaciones_mes
    return {
      puede: usadas < limite,
      plan,
      usadas,
      limite,
      restantes: limite - usadas,
    }
  } catch {
    return { puede: true, plan, usadas: 0, limite: PLANES[plan].evaluaciones_mes, restantes: PLANES[plan].evaluaciones_mes }
  }
}

export async function incrementarUso(supabase, userId) {
  const mes = new Date().toISOString().slice(0, 7)
  try {
    const { data } = await supabase
      .from('uso_mensual')
      .select('id, evaluaciones')
      .eq('user_id', userId)
      .eq('mes', mes)
      .single()

    if (data) {
      await supabase
        .from('uso_mensual')
        .update({ evaluaciones: data.evaluaciones + 1 })
        .eq('id', data.id)
    } else {
      await supabase
        .from('uso_mensual')
        .insert({ user_id: userId, mes, evaluaciones: 1 })
    }
  } catch (e) {
    console.error('Error incrementando uso:', e.message)
  }
}