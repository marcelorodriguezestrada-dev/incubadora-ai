# Pasos para configurar Google OAuth en Supabase

## 1. En Supabase Dashboard

1. Ir a Authentication → Providers → Google
2. Activar Google provider
3. Ir a https://console.cloud.google.com
4. Crear proyecto → APIs & Services → Credentials
5. Crear OAuth 2.0 Client ID:
   - Application type: Web application
   - Authorized redirect URIs: https://xxxx.supabase.co/auth/v1/callback
6. Copiar Client ID y Client Secret
7. Pegarlos en Supabase → Authentication → Providers → Google

## 2. En Supabase → Authentication → URL Configuration

Agregar en "Redirect URLs":
- http://localhost:5173 (desarrollo)
- https://tu-dominio.vercel.app (producción)

## 3. Variables de entorno del frontend

En frontend/.env.local:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...  (anon key, NO la service key)
VITE_API_URL=http://localhost:8000
```

## 4. Variables de entorno del backend

En backend/.env:
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...  (service role key, la que tiene más permisos)
ANTHROPIC_API_KEY=sk-ant-...
```

## 5. SQL en Supabase para RLS

Ejecutar en SQL Editor de Supabase:

```sql
-- Habilitar RLS en la tabla evaluaciones
ALTER TABLE evaluaciones ENABLE ROW LEVEL SECURITY;

-- Política: cada usuario solo ve sus propias evaluaciones
CREATE POLICY "usuarios_ven_propias" ON evaluaciones
  FOR ALL USING (auth.uid()::text = user_id);
```

## Dónde encontrar las keys en Supabase

- Project Settings → API → Project URL → SUPABASE_URL
- Project Settings → API → anon public → VITE_SUPABASE_ANON_KEY
- Project Settings → API → service_role → SUPABASE_SERVICE_KEY (nunca al frontend)
