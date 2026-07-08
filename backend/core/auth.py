"""
Autenticación con Supabase JWT.
Reemplaza el _get_user_id() fake que había en todas las rutas.

Uso en cualquier endpoint:
    from core.auth import get_current_user, UserInfo

    @router.get("/algo")
    async def mi_ruta(user: UserInfo = Depends(get_current_user)):
        print(user.id, user.email)
"""
from fastapi import Depends, HTTPException, Header
from typing import Optional
from dataclasses import dataclass
import os
import httpx


@dataclass
class UserInfo:
    id: str
    email: str


async def get_current_user(
    authorization: Optional[str] = Header(None),
) -> UserInfo:
    """
    Valida el JWT de Supabase y retorna el usuario.
    Lanza 401 si el token es inválido o expiró.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token requerido")

    token = authorization.replace("Bearer ", "").strip()

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase no configurado")

    # Validar el token preguntándole a Supabase
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(
                f"{supabase_url}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": supabase_key,
                },
                timeout=10.0,
            )
        except httpx.TimeoutException:
            raise HTTPException(status_code=503, detail="Timeout validando token")

    if res.status_code == 401:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")

    if res.status_code != 200:
        raise HTTPException(status_code=401, detail="No se pudo validar el token")

    data = res.json()
    user_id = data.get("id")
    email = data.get("email", "")

    if not user_id:
        raise HTTPException(status_code=401, detail="Token sin usuario asociado")

    return UserInfo(id=user_id, email=email)


async def get_optional_user(
    authorization: Optional[str] = Header(None),
) -> Optional[UserInfo]:
    """
    Igual que get_current_user pero no lanza error si no hay token.
    Útil para endpoints que funcionan con y sin auth.
    """
    if not authorization:
        return None
    try:
        return await get_current_user(authorization)
    except HTTPException:
        return None
