import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  type User,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db, googleProvider } from '@/lib/firebase'
import { claimMemberInvite } from '@/services/firm'
import type { AppUser, AppUserType, FirmMemberRole, FirmStatus } from '@/types'

interface AuthContextValue {
  user: AppUser | null
  firebaseUser: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<void>
  resendVerificationEmail: () => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function resolveUserType(firebaseUser: User): Promise<AppUser> {
  const uid = firebaseUser.uid
  const email = firebaseUser.email ?? ''

  // 1. ¿Es superadmin?
  try {
    const adminDoc = await getDoc(doc(db, 'platformAdmins', uid))
    if (adminDoc.exists()) {
      return {
        uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        userType: 'superadmin' as AppUserType,
      }
    }
  } catch {
    // Sin permisos, continuar
  }

  // 2. ¿Es miembro de un despacho?
  try {
    const indexDoc = await getDoc(doc(db, 'userFirmIndex', uid))
    if (indexDoc.exists()) {
      const data = indexDoc.data()
      return {
        uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        userType: 'firm_member' as AppUserType,
        firmId: data.firmId as string,
        memberRole: data.role as FirmMemberRole,
        firmStatus: data.firmStatus as FirmStatus,
      }
    }
  } catch {
    // Sin índice, continuar
  }

  // 2.5. ¿Tiene una invitación de miembro de despacho pendiente para este
  // email? (TeamTab → "Añadir miembro" crea el documento en
  // firms/{firmId}/members pero, hasta ahora, nunca vinculaba la cuenta que
  // esa persona crease después — se quedaba sin userFirmIndex y terminaba
  // creando su propio despacho en Onboarding). Solo si el email está
  // verificado, mismo criterio que el resto de resoluciones por email de
  // aquí abajo — con Google siempre lo está, con email/contraseña solo tras
  // confirmar el enlace de verificación.
  if (firebaseUser.emailVerified) {
    try {
      const claimed = await claimMemberInvite(uid, email)
      if (claimed) {
        return {
          uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          userType: 'firm_member' as AppUserType,
          firmId: claimed.firmId,
          memberRole: claimed.role,
        }
      }
    } catch {
      // Sin invitación válida, continuar
    }
  }

  // 3. ¿Es cliente de portal? — buscar por email. Solo si el email está
  // verificado: con Google siempre lo está, pero con email/contraseña
  // cualquiera podría registrarse con el email de otra persona, así que
  // sin verificar no se concede esta identidad (las reglas de Firestore
  // exigen lo mismo del lado del servidor).
  if (firebaseUser.emailVerified) {
    try {
      const { collection, query, where, getDocs } = await import('firebase/firestore')
      const portalRef = collection(db, 'portalClients')
      const q = query(portalRef, where('email', '==', email.toLowerCase().trim()))
      const snap = await getDocs(q)
      if (!snap.empty) {
        return {
          uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          userType: 'portal_client' as AppUserType,
        }
      }
    } catch {
      // Sin acceso portal, continuar
    }
  }

  // 4. ¿Es colaborador con acceso a la plataforma? — índice por uid,
  // igual que userFirmIndex (ver services/collaborators.ts)
  try {
    const indexDoc = await getDoc(doc(db, 'collaboratorIndex', uid))
    if (indexDoc.exists()) {
      return {
        uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        userType: 'collaborator' as AppUserType,
      }
    }
  } catch {
    // Sin colaboraciones, continuar
  }

  // 5. Usuario nuevo sin contexto → onboarding
  return {
    uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    userType: 'unknown' as AppUserType,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser)
        const appUser = await resolveUserType(fbUser)
        setUser(appUser)
      } else {
        setFirebaseUser(null)
        setUser(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const refreshUser = useCallback(async () => {
    if (!firebaseUser) return
    const appUser = await resolveUserType(firebaseUser)
    setUser(appUser)
  }, [firebaseUser])

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider)
  }

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password)
  }

  const signUpWithEmail = async (email: string, password: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password)
    await sendEmailVerification(credential.user)
  }

  const resendVerificationEmail = async () => {
    if (!auth.currentUser) return
    await sendEmailVerification(auth.currentUser)
  }

  const logout = async () => {
    await signOut(auth)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        resendVerificationEmail,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}