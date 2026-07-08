"""
Agente Co-Fundador — Chat contextual sobre la evaluación.
Usa call_chat() de Groq para manejar el historial correctamente.
"""
from core.claude import call_chat
from typing import List, Dict, Optional

PREGUNTAS_SUGERIDAS = [
    "¿Cómo bajo el CAPEX inicial?",
    "Dame 3 variantes del modelo de negocio",
    "¿Qué pasa si arranco solo sin contratar?",
    "¿Cómo me protejo de la devaluación?",
    "¿Por dónde arranco mañana?",
    "¿Cuál es el competidor más peligroso?",
    "¿Qué haría diferente con más capital?",
    "¿En qué escenario es más riesgoso este negocio?",
]

SYSTEM_TEMPLATE = """Sos el co-fundador IA de una incubadora de emprendimientos especializada en Argentina.
Tenés acceso completo al análisis de la idea del usuario y tu trabajo es ayudarlo a mejorarla.

ANÁLISIS DE LA IDEA:
{contexto}

TU ROL:
- Respondés preguntas específicas sobre la evaluación con datos concretos
- Sugerís mejoras accionables basadas en los números reales del análisis
- Das alternativas cuando algo no funciona
- Siempre contextualizás en la realidad argentina (inflación, costos, mercado)
- Respuestas directas de máximo 3-4 párrafos o viñetas
- Si algo cambia el modelo, ofrecé re-evaluar"""


def chat_cofundador(
    mensaje: str,
    historial: List[Dict[str, str]],
    resultado_evaluacion: dict,
    escenarios: Optional[dict] = None,
) -> str:
    fin = resultado_evaluacion.get("financiero", {})
    mer = resultado_evaluacion.get("mercado", {})

    ctx = [
        f"IDEA: {resultado_evaluacion.get('idea_original', '')}",
        f"VEREDICTO: {resultado_evaluacion.get('veredicto', '')} (Score: {resultado_evaluacion.get('score_global', 0)}/100)",
        f"RESUMEN: {resultado_evaluacion.get('resumen_ejecutivo', '')}",
        f"CAPEX: USD {fin.get('capex_estimado_usd', 0):,.0f} | ROI: {fin.get('roi_estimado_pct', 0)}% | Payback: {fin.get('payback_meses', 0)} meses | Margen: {fin.get('margen_bruto_pct', 0)}% | Riesgo: {fin.get('riesgo', '—')}",
        f"MERCADO: score {mer.get('score_viabilidad', 0)}/100 | Prob. éxito {mer.get('probabilidad_exito_pct', 0)}% | TAM: {mer.get('tam_estimado', '—')}",
        f"Diferenciador: {mer.get('diferenciador_clave', '—')}",
        f"Competidores: {', '.join(mer.get('competidores_principales', []))}",
        f"Advertencias: {'; '.join(mer.get('advertencias', []))}",
    ]

    if escenarios and escenarios.get("escenarios"):
        for e in escenarios["escenarios"]:
            ctx.append(f"Escenario {e.get('nombre')}: inflación {e.get('inflacion_anual_pct')}% → ROI real {e.get('roi_ajustado_pct')}%, {'sobrevive' if e.get('sobrevive') else 'COLAPSA'}")

    proximos = resultado_evaluacion.get("proximos_pasos", [])
    if proximos:
        ctx.append(f"Próximos pasos: {'; '.join(proximos[:3])}")

    system = SYSTEM_TEMPLATE.format(contexto="\n".join(ctx))

    # Construir historial para Groq
    messages = [{"role": m["role"], "content": m["content"]} for m in historial[-10:]]
    messages.append({"role": "user", "content": mensaje})

    return call_chat(system, messages, max_tokens=800)
