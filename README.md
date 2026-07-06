# incubadora-ai — v5: Auth real con Supabase

## Archivos en este paquete

| Archivo | Dónde va | Qué hace |
|---------|----------|----------|
| `backend/core/auth.py` | `/backend/core/` | Middleware JWT — valida tokens de Supabase en cada request |
| `backend/api/routes_v2.py` | `/backend/api/` | Todos los endpoints con auth real usando Depends() |
| `backend/main.py` | `/backend/` | Reemplaza el main.py existente |
| `backend/.env.example` | `/backend/` | Variables actualizadas |
| `frontend/src/hooks/useAuth.js` | `/frontend/src/hooks/` | Hook de Supabase Auth con Google OAuth |
| `frontend/src/components/AuthScreen.jsx` | `/frontend/src/components/` | Pantalla de login — Google + email/password |
| `frontend/src/App.jsx` | `/frontend/src/` | App completa con auth integrada |
| `frontend/.env.example` | `/frontend/` | Variables del frontend |
| `SUPABASE_SETUP.md` | raíz | Guía paso a paso para configurar Google OAuth |

## Lo que cambia respecto a v4

### Backend
- `_get_user_id()` fake → `get_current_user()` real con validación JWT
- Todos los endpoints del historial ahora usan `Depends(get_current_user)`
- `/evaluar-completo` y `/chat` usan `get_optional_user` — funcionan sin auth pero guardan si hay usuario
- Nuevo endpoint `GET /api/me` para verificar sesión desde el frontend

### Frontend
- `useAuth()` hook maneja toda la sesión con Supabase
- `AuthScreen` — login con Google en 2 clicks + email/password como fallback
- `App.jsx` muestra `AuthScreen` si no hay sesión, dashboard si hay
- Spinner mientras Supabase verifica la sesión inicial (evita flash de login)
- Token se pasa automáticamente a todos los fetch que lo necesitan

## Setup rápido

```bash
# 1. Configurar Google OAuth en Supabase (ver SUPABASE_SETUP.md)

# 2. Frontend
cd frontend
cp .env.example .env.local
# completar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm install @supabase/supabase-js
npm run dev

# 3. Backend
cd backend
cp .env.example .env
# completar SUPABASE_URL, SUPABASE_SERVICE_KEY y ANTHROPIC_API_KEY
pip install -r requirements.txt
uvicorn main:app --reload
```

## Flujo de auth completo

```
Usuario entra → AuthScreen
  ↓ click "Continuar con Google"
Supabase redirige a Google
  ↓ el usuario aprueba
Supabase redirige de vuelta con token JWT
  ↓ useAuth() detecta la sesión
App.jsx muestra el dashboard
  ↓ token se incluye en cada request al backend
backend/core/auth.py valida el JWT contra Supabase
  ↓ retorna UserInfo(id, email)
El endpoint usa user.id para guardar/leer datos del usuario
```
# incubadora-ai
