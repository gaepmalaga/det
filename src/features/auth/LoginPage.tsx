import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Fingerprint, FileSearch, ShieldCheck, BookOpen, Mail } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/constants/routes'
import { authErrorMessage } from '@/lib/authErrors'

const HIGHLIGHTS = [
  { icon: FileSearch, text: 'Del contacto al expediente, sin hojas de cálculo sueltas' },
  { icon: BookOpen, text: 'Libro-registro fiel a la Ley de Seguridad Privada' },
  { icon: ShieldCheck, text: 'Cada despacho en su propio espacio, sin cruces de datos' },
]

export function LoginPage() {
  const {
    user,
    firebaseUser,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resendVerificationEmail,
    logout,
  } = useAuth()
  const navigate = useNavigate()

  const [showEmailForm, setShowEmailForm] = useState(false)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resent, setResent] = useState(false)

  const isUnverifiedPassword =
    !!firebaseUser &&
    firebaseUser.providerData.some((p) => p.providerId === 'password') &&
    !firebaseUser.emailVerified

  useEffect(() => {
    if (!loading && user && !isUnverifiedPassword) {
      if (user.userType === 'superadmin') navigate(ROUTES.SUPERADMIN)
      else if (user.userType === 'firm_member') navigate(ROUTES.DASHBOARD)
      else if (user.userType === 'portal_client') navigate(ROUTES.PORTAL)
      else if (user.userType === 'collaborator') navigate(ROUTES.COLLABORATE)
      else navigate(ROUTES.ONBOARDING)
    }
  }, [user, loading, navigate, isUnverifiedPassword])

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'signup') {
        await signUpWithEmail(email, password)
      } else {
        await signInWithEmail(email, password)
      }
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleResend = async () => {
    await resendVerificationEmail()
    setResent(true)
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-background">
      {/* Panel de marca — solo en pantallas grandes */}
      <div
        className="hidden lg:flex relative flex-col justify-between overflow-hidden px-14 py-12 text-primary-foreground"
        style={{
          background:
            'radial-gradient(120% 100% at 15% 0%, oklch(0.4 0.09 259) 0%, oklch(0.26 0.07 260) 55%, oklch(0.19 0.05 261) 100%)',
        }}
      >
        <Fingerprint
          className="pointer-events-none absolute -right-24 -bottom-24 w-[30rem] h-[30rem] text-white/[0.05]"
          strokeWidth={0.6}
        />

        <div className="relative flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-brand-gold text-brand-gold-foreground">
            <Fingerprint className="w-4 h-4" strokeWidth={2.25} />
          </div>
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-primary-foreground/70">
            DetectiveOS
          </span>
        </div>

        <div className="relative max-w-md">
          <div className="w-9 h-px bg-brand-gold mb-7" />
          <p className="text-4xl font-semibold leading-[1.15] tracking-tight text-balance">
            La operativa de tu despacho, en un solo sitio.
          </p>
          <p className="mt-4 text-sm text-primary-foreground/60 leading-relaxed max-w-sm">
            Contactos, presupuestos, expedientes y libro-registro — pensado para
            despachos de investigación privada, no adaptado de otra cosa.
          </p>

          <ul className="mt-11 space-y-5">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3.5 text-sm text-primary-foreground/85">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-white/[0.06] ring-1 ring-white/10 shrink-0">
                  <Icon className="w-3.5 h-3.5 text-brand-gold" strokeWidth={2} />
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[11px] tracking-wide text-primary-foreground/40">
          Plataforma de gestión para despachos de detectives privados
        </p>
      </div>

      {/* Formulario */}
      <div className="relative flex items-center justify-center min-h-screen p-4 py-16 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(70% 50% at 50% 0%, oklch(0.32 0.085 259 / 0.07) 0%, transparent 100%)',
          }}
        />

        <div className="relative w-full max-w-sm">
          <div className="flex lg:hidden items-center justify-center gap-2.5 mb-10">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary text-primary-foreground">
              <Fingerprint className="w-4 h-4" strokeWidth={2.25} />
            </div>
            <span className="text-xs font-semibold tracking-[0.2em] uppercase text-foreground/70">
              DetectiveOS
            </span>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-8 sm:p-9 shadow-[0_1px_1px_rgba(15,23,42,0.03),0_16px_40px_-16px_rgba(15,23,42,0.16)]">
            <div className="w-8 h-1 rounded-full bg-brand-gold mb-6" />

            {isUnverifiedPassword ? (
              <>
                <div className="mb-8">
                  <h1 className="text-[1.6rem] font-semibold tracking-tight text-foreground leading-tight">
                    Verifica tu email
                  </h1>
                  <p className="text-sm text-muted-foreground mt-2.5 leading-relaxed">
                    Te hemos enviado un enlace de verificación a{' '}
                    <strong className="text-foreground">{firebaseUser?.email}</strong>.
                    Ábrelo y vuelve aquí para continuar.
                  </p>
                </div>
                <Button
                  onClick={handleResend}
                  disabled={resent}
                  size="lg"
                  variant="outline"
                  className="w-full justify-center gap-2 py-5 text-sm"
                >
                  {resent ? 'Enlace reenviado' : 'Reenviar email de verificación'}
                </Button>
                <button
                  onClick={() => logout()}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground mt-5 underline-offset-4 hover:underline"
                >
                  Usar otra cuenta
                </button>
              </>
            ) : (
              <>
                <div className="mb-8">
                  <h1 className="text-[1.6rem] font-semibold tracking-tight text-foreground leading-tight">
                    Acceder a tu despacho
                  </h1>
                  <p className="text-sm text-muted-foreground mt-2.5 leading-relaxed">
                    {showEmailForm
                      ? mode === 'signup'
                        ? 'Crea tu cuenta con email y contraseña.'
                        : 'Inicia sesión con tu email y contraseña.'
                      : 'Inicia sesión con tu cuenta de Google para continuar.'}
                  </p>
                </div>

                {showEmailForm ? (
                  <form onSubmit={handleEmailSubmit} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1.5">Email</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="tu@despacho.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1.5">Contraseña</label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="••••••••"
                      />
                    </div>

                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-xs text-red-700">
                        {error}
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={submitting}
                      size="lg"
                      className="w-full justify-center py-5 text-sm"
                    >
                      {submitting
                        ? 'Un momento...'
                        : mode === 'signup'
                          ? 'Crear cuenta'
                          : 'Iniciar sesión'}
                    </Button>

                    <button
                      type="button"
                      onClick={() => {
                        setMode(mode === 'signup' ? 'signin' : 'signup')
                        setError(null)
                      }}
                      className="w-full text-center text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                    >
                      {mode === 'signup' ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Créala'}
                    </button>
                  </form>
                ) : (
                  <Button
                    onClick={signInWithGoogle}
                    disabled={loading}
                    size="lg"
                    variant="outline"
                    className="w-full justify-center gap-3 py-5 text-sm shadow-sm hover:shadow hover:bg-accent/40 transition-all"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continuar con Google
                  </Button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowEmailForm(!showEmailForm)
                    setError(null)
                  }}
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mt-4 underline-offset-4 hover:underline"
                >
                  <Mail className="w-3.5 h-3.5" />
                  {showEmailForm ? 'Usar Google en su lugar' : 'Usar email y contraseña'}
                </button>

                <p className="text-center text-[11px] text-muted-foreground/80 mt-6 leading-relaxed">
                  Al continuar, aceptas que tu despacho gestione sus datos de
                  forma aislada e independiente en la plataforma.
                </p>
              </>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-7">
            ¿Nuevo despacho?{' '}
            <a href={ROUTES.PRICING} className="text-foreground hover:underline underline-offset-4">
              Ver planes
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
