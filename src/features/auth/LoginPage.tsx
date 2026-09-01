import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Fingerprint, FileSearch, ShieldCheck, BookOpen } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/constants/routes'

const HIGHLIGHTS = [
  { icon: FileSearch, text: 'Del contacto al expediente, sin hojas de cálculo sueltas' },
  { icon: BookOpen, text: 'Libro-registro fiel a la Ley de Seguridad Privada' },
  { icon: ShieldCheck, text: 'Cada despacho en su propio espacio, sin cruces de datos' },
]

export function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user) {
      if (user.userType === 'superadmin') navigate(ROUTES.SUPERADMIN)
      else if (user.userType === 'firm_member') navigate(ROUTES.DASHBOARD)
      else if (user.userType === 'portal_client') navigate(ROUTES.PORTAL)
      else navigate(ROUTES.ONBOARDING)
    }
  }, [user, loading, navigate])

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Panel de marca — solo en pantallas grandes */}
      <div className="hidden lg:flex relative flex-col justify-between overflow-hidden bg-primary px-12 py-12 text-primary-foreground">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1.5px 1.5px, currentColor 1.5px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand-gold text-brand-gold-foreground">
            <Fingerprint className="w-5 h-5" />
          </div>
          <span className="text-sm font-semibold tracking-wide">DetectiveOS</span>
        </div>

        <div className="relative max-w-md">
          <p className="text-3xl font-semibold leading-tight tracking-tight text-balance">
            La operativa de tu despacho de investigación, en un solo sitio.
          </p>
          <ul className="mt-10 space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-primary-foreground/80">
                <Icon className="w-4 h-4 mt-0.5 shrink-0 text-brand-gold" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-primary-foreground/50">
          Plataforma de gestión para despachos de detectives privados
        </p>
      </div>

      {/* Formulario */}
      <div className="flex items-center justify-center p-4 py-16">
        <div className="w-full max-w-sm">
          <div className="flex lg:hidden items-center justify-center gap-2.5 mb-8">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground">
              <Fingerprint className="w-5 h-5" />
            </div>
            <span className="text-base font-semibold tracking-tight text-foreground">
              DetectiveOS
            </span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Acceder a tu despacho
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Inicia sesión con tu cuenta de Google para continuar.
            </p>
          </div>

          <Button
            onClick={signInWithGoogle}
            disabled={loading}
            size="lg"
            variant="outline"
            className="w-full justify-center gap-3 py-5 text-sm"
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

          <p className="text-center text-xs text-muted-foreground mt-8">
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
