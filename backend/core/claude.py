"""
Cliente de Groq — reemplaza Anthropic.
Groq es más rápido y más barato para este uso.

Modelos disponibles en Groq (julio 2025):
  - llama-3.3-70b-versatile   ← mejor calidad, recomendado
  - llama-3.1-8b-instant      ← más rápido, para respuestas simples
  - mixtral-8x7b-32768        ← bueno para JSON largo
  - gemma2-9b-it              ← alternativa ligera
"""
import os
import json
import re
from groq import Groq

_client = None
MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")


def get_client() -> Groq:
    global _client
    if _client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY no configurada")
        _client = Groq(api_key=api_key)
    return _client


def call_agent(
    system_prompt: str,
    user_message: str,
    max_tokens: int = 2000,
    model: str = None,
) -> str:
    """
    Llama a Groq con un system prompt específico del agente.
    Retorna el texto de la respuesta.
    """
    client = get_client()
    response = client.chat.completions.create(
        model=model or MODEL,
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        temperature=0.3,   # bajo para respuestas más consistentes en análisis
    )
    return response.choices[0].message.content


def call_agent_json(
    system_prompt: str,
    user_message: str,
    max_tokens: int = 2000,
    model: str = None,
) -> dict:
    """
    Llama a Groq y parsea la respuesta como JSON.
    El system prompt debe indicar que responda solo con JSON.
    """
    # Reforzar que responda solo JSON
    system_reforzado = system_prompt.strip() + "\n\nIMPORTANTE: Respondé ÚNICAMENTE con el JSON. Sin texto antes ni después. Sin markdown. Sin explicaciones."

    raw = call_agent(system_reforzado, user_message, max_tokens, model)

    # Limpiar markdown fences si los hay
    clean = re.sub(r"```json\s*|\s*```", "", raw).strip()

    # A veces Groq agrega texto antes del JSON — extraer solo el JSON
    match = re.search(r'\{[\s\S]*\}', clean)
    if match:
        clean = match.group(0)

    try:
        return json.loads(clean)
    except json.JSONDecodeError as e:
        raise ValueError(f"Groq no devolvió JSON válido: {e}\nRespuesta: {raw[:300]}")


def call_chat(
    system_prompt: str,
    messages: list,
    max_tokens: int = 800,
    model: str = None,
) -> str:
    """
    Para el chat del co-fundador — acepta historial de mensajes.
    """
    client = get_client()
    msgs = [{"role": "system", "content": system_prompt}] + messages
    response = client.chat.completions.create(
        model=model or MODEL,
        max_tokens=max_tokens,
        messages=msgs,
        temperature=0.7,   # más alto para respuestas más naturales en chat
    )
    return response.choices[0].message.content
