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
  signOut,
  type User,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db, googleProvider } from '@/lib/firebase'
import type { AppUser, AppUserType, FirmMemberRole, FirmStatus } from '@/types'

interface AuthContextValue {
  user: AppUser | null
  firebaseUser: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
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

  // 3. ¿Es cliente de portal? — buscar por email
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

  // 4. Usuario nuevo sin contexto → onboarding
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