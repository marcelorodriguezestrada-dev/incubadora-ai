"""
Rutas actualizadas con auth real.
Reemplaza los archivos routes.py, historial.py y chat.py existentes
para que usen get_current_user en lugar del _get_user_id() falso.
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import Optional
from io import BytesIO
from pydantic import BaseModel

from core.auth import get_current_user, get_optional_user, UserInfo
from models.idea import IdeaInput, ResultadoEvaluacion
from agents.orchestrator import evaluar_idea
from agents.escenarios import simular_escenarios, SimulacionEscenarios
from agents.cofundador import chat_cofundador, PREGUNTAS_SUGERIDAS
from core.pdf_generator import generar_pdf
from core.supabase_client import get_supabase

router = APIRouter()


# ── Modelos ───────────────────────────────────────────────────────────────────

class EvaluacionConEscenarios(BaseModel):
    resultado: ResultadoEvaluacion
    escenarios: Optional[SimulacionEscenarios] = None


class MensajeChat(BaseModel):
    mensaje: str
    historial: list = []
    resultado_evaluacion: dict
    escenarios: Optional[dict] = None


class ComparacionRequest(BaseModel):
    eval_id_a: str
    eval_id_b: str


# ── Evaluación ────────────────────────────────────────────────────────────────

@router.post("/evaluar-completo", response_model=EvaluacionConEscenarios)
async def evaluar_completo(
    idea: IdeaInput,
    user: Optional[UserInfo] = Depends(get_optional_user),
):
    """
    Evaluación completa + escenarios.
    Funciona sin auth pero guarda en DB si hay usuario.
    """
    try:
        resultado = evaluar_idea(idea)
        esc = simular_escenarios(idea, resultado.financiero)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if user:
        try:
            db = get_supabase()
            data = resultado.model_dump(mode="json")
            data["escenarios"] = esc.model_dump(mode="json")
            response = (
                db.table("evaluaciones")
                .insert({"user_id": user.id, "idea_original": resultado.idea_original,
                         "score_global": resultado.score_global, "veredicto": resultado.veredicto,
                         "resultado_json": data})
                .execute()
            )
            resultado.id = response.data[0]["id"]
        except Exception:
            pass  # No fallar si no se puede guardar

    return EvaluacionConEscenarios(resultado=resultado, escenarios=esc)


# ── Historial ─────────────────────────────────────────────────────────────────

@router.get("/historial")
async def listar_historial(user: UserInfo = Depends(get_current_user)):
    db = get_supabase()
    try:
        response = (
            db.table("evaluaciones")
            .select("id, idea_original, score_global, veredicto, created_at, resultado_json")
            .eq("user_id", user.id)
            .order("created_at", desc=True)
            .limit(50)
            .execute()
        )
        # Extraer campos financieros del JSON para la tabla
        items = []
        for row in response.data:
            json_data = row.get("resultado_json", {})
            fin = json_data.get("financiero", {})
            mer = json_data.get("mercado", {})
            items.append({
                "id": row["id"],
                "idea_original": row["idea_original"],
                "score_global": row["score_global"],
                "veredicto": row["veredicto"],
                "created_at": row["created_at"],
                "capex_estimado_usd": fin.get("capex_estimado_usd"),
                "roi_estimado_pct": fin.get("roi_estimado_pct"),
                "riesgo": fin.get("riesgo"),
                "probabilidad_exito_pct": mer.get("probabilidad_exito_pct"),
                "score_viabilidad": mer.get("score_viabilidad"),
            })
        return items
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/historial/{eval_id}")
async def obtener_evaluacion(eval_id: str, user: UserInfo = Depends(get_current_user)):
    db = get_supabase()
    try:
        response = (
            db.table("evaluaciones")
            .select("*")
            .eq("id", eval_id)
            .eq("user_id", user.id)
            .single()
            .execute()
        )
        return response.data
    except Exception:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")


@router.delete("/historial/{eval_id}")
async def eliminar_evaluacion(eval_id: str, user: UserInfo = Depends(get_current_user)):
    db = get_supabase()
    try:
        db.table("evaluaciones").delete().eq("id", eval_id).eq("user_id", user.id).execute()
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/historial/comparar")
async def comparar(payload: ComparacionRequest, user: UserInfo = Depends(get_current_user)):
    db = get_supabase()
    try:
        r_a = db.table("evaluaciones").select("resultado_json, created_at").eq("id", payload.eval_id_a).eq("user_id", user.id).single().execute()
        r_b = db.table("evaluaciones").select("resultado_json, created_at").eq("id", payload.eval_id_b).eq("user_id", user.id).single().execute()
    except Exception:
        raise HTTPException(status_code=404, detail="Una o ambas evaluaciones no encontradas")

    a = r_a.data["resultado_json"]
    b = r_b.data["resultado_json"]

    def delta(val_a, val_b, higher_is_better=True):
        try:
            diff = float(val_b) - float(val_a)
            pct = (diff / float(val_a) * 100) if float(val_a) != 0 else 0
            return {"valor_a": val_a, "valor_b": val_b, "diff": round(diff, 2),
                    "pct": round(pct, 1), "mejor": (diff > 0) == higher_is_better}
        except Exception:
            return {"valor_a": val_a, "valor_b": val_b, "diff": None, "pct": None, "mejor": None}

    return {
        "eval_a": {"id": payload.eval_id_a, "fecha": r_a.data["created_at"], "idea": a.get("idea_original", "")[:80]},
        "eval_b": {"id": payload.eval_id_b, "fecha": r_b.data["created_at"], "idea": b.get("idea_original", "")[:80]},
        "metricas": {
            "score_global":           delta(a.get("score_global", 0), b.get("score_global", 0)),
            "roi_estimado_pct":       delta(a.get("financiero", {}).get("roi_estimado_pct", 0), b.get("financiero", {}).get("roi_estimado_pct", 0)),
            "capex_estimado_usd":     delta(a.get("financiero", {}).get("capex_estimado_usd", 0), b.get("financiero", {}).get("capex_estimado_usd", 0), higher_is_better=False),
            "payback_meses":          delta(a.get("financiero", {}).get("payback_meses", 0), b.get("financiero", {}).get("payback_meses", 0), higher_is_better=False),
            "margen_bruto_pct":       delta(a.get("financiero", {}).get("margen_bruto_pct", 0), b.get("financiero", {}).get("margen_bruto_pct", 0)),
            "score_viabilidad":       delta(a.get("mercado", {}).get("score_viabilidad", 0), b.get("mercado", {}).get("score_viabilidad", 0)),
            "probabilidad_exito_pct": delta(a.get("mercado", {}).get("probabilidad_exito_pct", 0), b.get("mercado", {}).get("probabilidad_exito_pct", 0)),
        },
        "veredictos": {"a": a.get("veredicto", ""), "b": b.get("veredicto", ""),
                       "mejoro": b.get("score_global", 0) > a.get("score_global", 0)},
    }


# ── Chat ──────────────────────────────────────────────────────────────────────

@router.post("/chat")
async def chat(payload: MensajeChat):
    """El chat no requiere auth — funciona para usuarios anónimos también."""
    if not payload.mensaje.strip():
        raise HTTPException(status_code=400, detail="Mensaje vacío")
    try:
        respuesta = chat_cofundador(
            mensaje=payload.mensaje,
            historial=payload.historial,
            resultado_evaluacion=payload.resultado_evaluacion,
            escenarios=payload.escenarios,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    import random
    return {
        "respuesta": respuesta,
        "preguntas_sugeridas": random.sample(PREGUNTAS_SUGERIDAS, min(4, len(PREGUNTAS_SUGERIDAS))),
    }


# ── PDF ───────────────────────────────────────────────────────────────────────

@router.post("/pdf-directo")
async def pdf_directo(payload: EvaluacionConEscenarios):
    try:
        pdf_bytes = generar_pdf(
            resultado=payload.resultado.model_dump(mode="json"),
            escenarios=payload.escenarios.model_dump(mode="json") if payload.escenarios else None,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    slug = payload.resultado.idea_original[:30].replace(" ", "-").lower()
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="incubadora-{slug}.pdf"'},
    )


# ── Me (para el frontend) ─────────────────────────────────────────────────────

@router.get("/me")
async def me(user: UserInfo = Depends(get_current_user)):
    """Retorna datos del usuario autenticado. Útil para el frontend."""
    return {"id": user.id, "email": user.email}
