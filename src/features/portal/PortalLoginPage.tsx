import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Fingerprint, Mail } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getClientPortalData } from '@/services/portal'
import { authErrorMessage } from '@/lib/authErrors'

export function PortalLoginPage() {
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
  const [checking, setChecking] = useState(false)
  const [noAccess, setNoAccess] = useState(false)

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
    if (loading || !firebaseUser || isUnverifiedPassword) return

    const check = async () => {
      setChecking(true)
      try {
        const data = await getClientPortalData(firebaseUser.email!)
        if (data && data.caseIds.length > 0) {
          navigate('/portal/cases')
        } else {
          setNoAccess(true)
        }
      } finally {
        setChecking(false)
      }
    }

    check()
  }, [firebaseUser, loading, navigate, isUnverifiedPassword])

  const handleLogout = async () => {
    await logout()
    setNoAccess(false)
  }

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
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary mb-6">
            <Fingerprint className="w-6 h-6 text-primary-foreground" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Portal cliente
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Accede para consultar el estado de tu investigación.
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
          {isUnverifiedPassword ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-foreground mb-1">Verifica tu email</h2>
                <p className="text-sm text-muted-foreground">
                  Te hemos enviado un enlace de verificación a{' '}
                  <strong className="text-foreground">{firebaseUser?.email}</strong>. Ábrelo y
                  vuelve aquí para continuar.
                </p>
              </div>
              <button
                onClick={handleResend}
                disabled={resent}
                className="w-full px-4 py-2.5 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
              >
                {resent ? 'Enlace reenviado' : 'Reenviar email de verificación'}
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
              >
                Usar otra cuenta
              </button>
            </div>
          ) : noAccess ? (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-900 mb-1">Sin acceso</p>
                <p className="text-xs text-red-700">
                  El email <strong>{firebaseUser?.email}</strong> no tiene expedientes
                  asociados en esta plataforma. Contacta con tu despacho de detectives.
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2.5 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Intentar con otra cuenta
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-foreground mb-1">
                  Acceder
                </h2>
                <p className="text-sm text-muted-foreground">
                  {showEmailForm
                    ? mode === 'signup'
                      ? 'Crea tu cuenta con el email que te dio acceso el despacho.'
                      : 'Usa el email y contraseña que te dio acceso el despacho.'
                    : 'Usa el mismo Gmail con el que el despacho te dio acceso.'}
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
                      placeholder="tu@email.com"
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

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full px-4 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {submitting
                      ? 'Un momento...'
                      : mode === 'signup'
                        ? 'Crear cuenta'
                        : 'Iniciar sesión'}
                  </button>

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
                <button
                  onClick={signInWithGoogle}
                  disabled={loading || checking}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground bg-card hover:bg-muted transition-colors disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  {checking ? 'Verificando acceso...' : 'Continuar con Google'}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowEmailForm(!showEmailForm)
                  setError(null)
                }}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
              >
                <Mail className="w-3.5 h-3.5" />
                {showEmailForm ? 'Usar Google en su lugar' : 'Usar email y contraseña'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}