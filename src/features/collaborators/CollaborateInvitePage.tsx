import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Fingerprint, CheckCircle, ShieldAlert } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { getCollaborator, acceptCollaboratorInvitation } from '@/services/collaborators'
import type { Collaborator } from '@/services/collaborators'

export function CollaborateInvitePage() {
  const { firmId, collaboratorId } = useParams<{ firmId: string; collaboratorId: string }>()
  const { firebaseUser, loading: authLoading, signInWithGoogle } = useAuth()
  const [collaborator, setCollaborator] = useState<Collaborator | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    if (!firmId || !collaboratorId) return
    getCollaborator(firmId, collaboratorId)
      .then((data) => {
        if (!data || !data.tienePlataforma) {
          setNotFound(true)
        } else {
          setCollaborator(data)
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [firmId, collaboratorId])

  const handleAccept = async () => {
    if (!firmId || !collaboratorId || !firebaseUser?.email) return
    setAccepting(true)
    try {
      await acceptCollaboratorInvitation(firmId, collaboratorId, firebaseUser.uid, firebaseUser.email)
      setAccepted(true)
    } finally {
      setAccepting(false)
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  if (notFound || !collaborator) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <p className="text-sm text-muted-foreground">
            Este enlace de invitación no es válido o ya no está disponible.
          </p>
        </div>
      </div>
    )
  }

  const isAccepted = accepted || collaborator.invitationStatus === 'aceptada'
  const emailMismatch =
    firebaseUser?.email &&
    collaborator.invitedEmail &&
    firebaseUser.email.toLowerCase().trim() !== collaborator.invitedEmail

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 py-16">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary mb-4">
            <Fingerprint className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Invitación de colaboración
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {collaborator.inviterFirmName ?? 'Un despacho'} te invita a colaborar en DetectiveOS.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
          {isAccepted ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-50 mb-4">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">
                Invitación aceptada
              </p>
              <p className="text-xs text-muted-foreground">
                Ya puedes acceder a tus colaboraciones desde{' '}
                <a href="/collaborate" className="text-primary hover:underline">
                  detectiveos.com/collaborate
                </a>
                .
              </p>
            </div>
          ) : !firebaseUser ? (
            <>
              <p className="text-sm text-muted-foreground mb-5">
                Inicia sesión con la cuenta de Google de{' '}
                <span className="text-foreground font-medium">{collaborator.invitedEmail}</span>{' '}
                para aceptar la invitación.
              </p>
              <Button
                onClick={signInWithGoogle}
                size="lg"
                variant="outline"
                className="w-full justify-center gap-3"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continuar con Google
              </Button>
            </>
          ) : emailMismatch ? (
            <div className="flex gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                Esta invitación es para {collaborator.invitedEmail}, pero has iniciado
                sesión como {firebaseUser.email}. Cierra sesión e inténtalo con la
                cuenta correcta.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-5">
                Sesión iniciada como{' '}
                <span className="text-foreground font-medium">{firebaseUser.email}</span>.
                Al aceptar, tendrás acceso a los expedientes donde{' '}
                {collaborator.inviterFirmName ?? 'este despacho'} te asigne como
                colaborador — nada más de su despacho.
              </p>
              <Button
                onClick={handleAccept}
                disabled={accepting}
                size="lg"
                className="w-full justify-center"
              >
                {accepting ? 'Aceptando...' : 'Aceptar invitación'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
