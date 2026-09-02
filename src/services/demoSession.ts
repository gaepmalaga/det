import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { seedDemoData } from './demoSeed'
import { getFirm } from './firm'

// Quien entra a probar la plataforma tiene que poder tocarlo todo —crear un
// presupuesto, anotar una actuación, cerrar un asunto— sin miedo a
// estropear nada y sin estropearle la demostración al siguiente. La forma
// de conseguirlo es que cada visita tenga su propio despacho: no un modo de
// solo lectura ni un simulador, la plataforma de verdad, con sus datos
// propios, que solo existen para esa persona.
//
// El despacho queda marcado con isDemo para poder limpiarlos después.

export type DemoRole = 'despacho' | 'colaborador' | 'cliente'

const STORAGE_KEY = 'detectiveos.demo'

interface StoredDemo {
  email: string
  password: string
  role: DemoRole
}

/** Contraseña de un solo uso: nadie la escribe ni la recuerda. */
function randomSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18))
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('')
}

export function storedDemo(): StoredDemo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredDemo) : null
  } catch {
    // Navegador con el almacenamiento bloqueado: se empieza de cero.
    return null
  }
}

function remember(demo: StoredDemo) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(demo))
  } catch {
    // Si no se puede recordar, la demostración sigue funcionando; lo único
    // que se pierde es poder volver a ella tras cerrar el navegador.
  }
}

export function forgetDemo() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* nada que hacer */
  }
}

const NOMBRES: Record<DemoRole, string> = {
  despacho: 'Detective de prueba',
  colaborador: 'Colaborador de prueba',
  cliente: 'Cliente de prueba',
}

/**
 * Crea un despacho nuevo, propio de quien entra, y lo rellena con un año de
 * trabajo verosímil. Devuelve cuando la plataforma ya tiene datos que
 * enseñar.
 */
export async function startDemo(role: DemoRole): Promise<void> {
  const id = crypto.randomUUID().slice(0, 8)
  // Dominio inexistente a propósito: la cuenta no puede recibir correo ni
  // servir para nada fuera de esta demostración.
  const email = `demo-${id}@demo.detectiveos.invalid`
  const password = randomSecret()
  const displayName = NOMBRES[role]

  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(cred.user, { displayName })

  const firmId = crypto.randomUUID()
  const memberId = cred.user.uid

  await setDoc(doc(db, 'firms', firmId), {
    isDemo: true,
    legalType: 'company',
    legalName: 'Investigaciones Demo S.L.',
    tradeName: 'Despacho de prueba',
    taxId: 'B00000000',
    rnsp: 'D-0000',
    registeredAddress: {
      street: 'Calle Ejemplo 1',
      city: 'Málaga',
      province: 'Málaga',
      postalCode: '29001',
      country: 'España',
    },
    titular: { memberId, tipNumber: 'D-0001', tipExpiry: null },
    customInvestigationTypes: [],
    status: 'trial',
    planId: 'trial',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  await setDoc(doc(db, 'firms', firmId, 'members', memberId), {
    userId: cred.user.uid,
    email,
    displayName,
    role: 'firm_owner',
    tipNumber: 'D-0001',
    tipExpiry: null,
    tipStatus: 'active',
    dependencyType: 'owner',
    preferences: { autoAssignAsDetective: false },
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  await setDoc(doc(db, 'userFirmIndex', cred.user.uid), {
    firmId,
    memberId,
    role: 'firm_owner',
    firmStatus: 'trial',
    updatedAt: serverTimestamp(),
  })

  remember({ email, password, role })

  // Un despacho vacío no enseña nada: se rellena antes de dejar entrar.
  const firm = await getFirm(firmId)
  if (firm) {
    await seedDemoData(firm, cred.user.uid, displayName)
  }
}
