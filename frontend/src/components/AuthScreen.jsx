import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function AuthScreen() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth()
  const [modo, setModo] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [cargandoGoogle, setCargandoGoogle] = useState(false)
  const [error, setError] = useState(null)
  const [mensaje, setMensaje] = useState(null)

  const handleGoogle = async () => {
    setCargandoGoogle(true); setError(null)
    try { await signInWithGoogle() }
    catch (e) { setError(e.message); setCargandoGoogle(false) }
  }

  const handleEmail = async (e) => {
    e.preventDefault()
    if (!email || !password) return
    setCargando(true); setError(null); setMensaje(null)
    try {
      if (modo === 'login') await signInWithEmail(email, password)
      else { await signUpWithEmail(email, password); setMensaje('Revisá tu email para confirmar la cuenta.') }
    } catch (e) {
      setError(e.message.includes('Invalid login') ? 'Email o contraseña incorrectos.'
        : e.message.includes('already registered') ? 'Email ya registrado. Iniciá sesión.' : e.message)
    } finally { setCargando(false) }
  }

  return (
    <div style={s.root}>
      <div style={s.card}>
        <div style={s.logo}>
          <span style={{ color: '#7c4dff' }}>◈ </span>
          <span style={{ color: '#fff', fontWeight: 800 }}>incubadora</span>
          <span style={{ color: '#7c4dff', fontWeight: 800 }}>.ai</span>
        </div>
        <div style={s.tagline}>Evaluá tu idea de negocio con IA en 60 segundos</div>
        <div style={s.benefits}>
          {['◈ Análisis financiero con contexto argentino',
            '◈ 3 escenarios inflacionarios (60%, 140%, 280%)',
            '◈ Roadmap de 8 semanas al primer ingreso',
            '◈ Chat con co-fundador IA'].map((b,i) => (
            <div key={i} style={s.benefit}>{b}</div>
          ))}
        </div>
        <div style={s.divider} />
        <button onClick={handleGoogle} disabled={cargandoGoogle}
          style={{ ...s.btnGoogle, ...(cargandoGoogle ? s.dis : {}) }}>
          {cargandoGoogle ? '⟳ Conectando...' : (
            <span style={{ display:'flex', alignItems:'center', gap:10, justifyContent:'center' }}>
              <GoogleIcon /> Continuar con Google
            </span>
          )}
        </button>
        <div style={s.orRow}>
          <div style={s.orLine}/><span style={s.orText}>o</span><div style={s.orLine}/>
        </div>
        <form onSubmit={handleEmail} style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
            placeholder="tu@email.com" required style={s.input} />
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
            placeholder="Contraseña" required minLength={6} style={s.input} />
          {error && <div style={s.error}>{error}</div>}
          {mensaje && <div style={s.success}>{mensaje}</div>}
          <button type="submit" disabled={cargando||!email||!password}
            style={{ ...s.btnEmail, ...(cargando||!email||!password ? s.dis : {}) }}>
            {cargando ? 'Cargando...' : modo==='login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </button>
        </form>
        <div style={s.toggleRow}>
          <span style={{ color:'#444', fontSize:13 }}>{modo==='login' ? '¿No tenés cuenta?' : '¿Ya tenés cuenta?'}</span>
          <button onClick={()=>{setModo(modo==='login'?'registro':'login');setError(null);setMensaje(null)}} style={s.btnToggle}>
            {modo==='login' ? 'Crear cuenta gratis' : 'Iniciar sesión'}
          </button>
        </div>
        <div style={s.legal}>Al continuar aceptás los términos de uso. Tus ideas son tuyas.</div>
      </div>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}body{background:#0a0a0a}input:focus{outline:none;border-color:#7c4dff!important}`}</style>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z"/>
    </svg>
  )
}

const s = {
  root: { minHeight:'100vh', background:'#0a0a0a', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px 16px', fontFamily:"'Inter',system-ui,sans-serif" },
  card: { background:'#0d0d0d', border:'1px solid #1a1a1a', borderRadius:16, padding:'36px 32px', width:'100%', maxWidth:420, display:'flex', flexDirection:'column', gap:16 },
  logo: { fontSize:22, letterSpacing:'-0.5px', textAlign:'center' },
  tagline: { color:'#555', fontSize:14, textAlign:'center', lineHeight:1.5 },
  benefits: { display:'flex', flexDirection:'column', gap:6 },
  benefit: { fontSize:12, color:'#444', lineHeight:1.5 },
  divider: { height:1, background:'#1a1a1a' },
  btnGoogle: { width:'100%', background:'#fff', color:'#111', border:'1px solid #e0e0e0', borderRadius:10, padding:'12px 16px', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' },
  orRow: { display:'flex', alignItems:'center', gap:10 },
  orLine: { flex:1, height:1, background:'#1a1a1a' },
  orText: { color:'#333', fontSize:12 },
  input: { background:'#111', border:'1px solid #1e1e1e', borderRadius:8, color:'#ccc', fontSize:14, padding:'11px 14px', fontFamily:'inherit', width:'100%' },
  btnEmail: { width:'100%', background:'#7c4dff', color:'#fff', border:'none', borderRadius:10, padding:'12px', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' },
  dis: { opacity:0.5, cursor:'not-allowed' },
  error: { background:'rgba(255,82,82,0.06)', border:'1px solid rgba(255,82,82,0.2)', color:'#ff8a80', padding:'10px 12px', borderRadius:8, fontSize:13 },
  success: { background:'rgba(0,200,83,0.06)', border:'1px solid rgba(0,200,83,0.2)', color:'#00c853', padding:'10px 12px', borderRadius:8, fontSize:13 },
  toggleRow: { display:'flex', alignItems:'center', justifyContent:'center', gap:8 },
  btnToggle: { background:'transparent', border:'none', color:'#7c4dff', fontSize:13, cursor:'pointer', fontFamily:'inherit', textDecoration:'underline' },
  legal: { color:'#333', fontSize:11, textAlign:'center' },
}
