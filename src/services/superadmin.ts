import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

export type FirmStatus = 'trial' | 'active' | 'suspended' | 'cancelled'

export interface SuperadminFirm {
  id: string
  legalName: string
  tradeName?: string
  taxId: string
  rnsp: string
  legalType: 'individual' | 'company'
  status: FirmStatus
  planId: string
  registeredAddress: {
    street: string
    city: string
    province: string
    postalCode: string
    country: string
  }
  titular: {
    memberId: string
    tipNumber: string
    tipExpiry?: Date
  }
  createdAt: Date
  updatedAt: Date
  memberCount?: number
  caseCount?: number
}

export interface SuperadminMetrics {
  totalFirms: number
  activeFirms: number
  trialFirms: number
  suspendedFirms: number
  totalMembers: number
  recentFirms: SuperadminFirm[]
}

function toDate(val: unknown): Date {
  if (!val) return new Date()
  if (val instanceof Timestamp) return val.toDate()
  if (val instanceof Date) return val
  return new Date()
}

function toDateOrUndefined(val: unknown): Date | undefined {
  if (!val) return undefined
  if (val instanceof Timestamp) return val.toDate()
  if (val instanceof Date) return val
  return undefined
}

function mapFirm(id: string, data: Record<string, unknown>): SuperadminFirm {
  const address = data.registeredAddress as Record<string, string> | undefined
  const titular = data.titular as Record<string, unknown> | undefined

  return {
    id,
    legalName: data.legalName as string,
    tradeName: data.tradeName as string | undefined,
    taxId: data.taxId as string,
    rnsp: data.rnsp as string,
    legalType: data.legalType as 'individual' | 'company',
    status: (data.status as FirmStatus) ?? 'trial',
    planId: (data.planId as string) ?? 'trial',
    registeredAddress: {
      street: address?.street ?? '',
      city: address?.city ?? '',
      province: address?.province ?? '',
      postalCode: address?.postalCode ?? '',
      country: address?.country ?? 'España',
    },
    titular: {
      memberId: (titular?.memberId as string) ?? '',
      tipNumber: (titular?.tipNumber as string) ?? '',
      tipExpiry: toDateOrUndefined(titular?.tipExpiry),
    },
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  }
}

export async function getAllFirms(): Promise<SuperadminFirm[]> {
  const ref = collection(db, 'firms')
  const q = query(ref, orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => mapFirm(d.id, d.data() as Record<string, unknown>))
}

export async function getFirmById(firmId: string): Promise<SuperadminFirm | null> {
  const ref = doc(db, 'firms', firmId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return mapFirm(snap.id, snap.data() as Record<string, unknown>)
}

export async function getFirmMemberCount(firmId: string): Promise<number> {
  const ref = collection(db, 'firms', firmId, 'members')
  const snap = await getDocs(ref)
  return snap.size
}

export async function getFirmCaseCount(firmId: string): Promise<number> {
  const ref = collection(db, 'firms', firmId, 'cases')
  const snap = await getDocs(ref)
  return snap.size
}

export async function getFirmMembers(firmId: string): Promise<{
  id: string
  displayName: string
  email: string
  role: string
  tipNumber?: string
  isActive: boolean
}[]> {
  const ref = collection(db, 'firms', firmId, 'members')
  const snap = await getDocs(ref)
  return snap.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      displayName: data.displayName as string,
      email: data.email as string,
      role: data.role as string,
      tipNumber: data.tipNumber as string | undefined,
      isActive: (data.isActive as boolean) ?? true,
    }
  })
}

export async function updateFirmStatus(
  firmId: string,
  status: FirmStatus
): Promise<void> {
  const ref = doc(db, 'firms', firmId)
  await updateDoc(ref, { status, updatedAt: serverTimestamp() })
}

export async function updateFirmPlan(
  firmId: string,
  planId: string
): Promise<void> {
  const ref = doc(db, 'firms', firmId)
  await updateDoc(ref, { planId, updatedAt: serverTimestamp() })
}

export async function getPlatformMetrics(): Promise<SuperadminMetrics> {
  const firms = await getAllFirms()

  const activeFirms = firms.filter((f) => f.status === 'active').length
  const trialFirms = firms.filter((f) => f.status === 'trial').length
  const suspendedFirms = firms.filter((f) => f.status === 'suspended').length

  let totalMembers = 0
  for (const firm of firms.slice(0, 20)) {
    const count = await getFirmMemberCount(firm.id)
    totalMembers += count
  }

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const recentFirms = firms
    .filter((f) => f.createdAt > thirtyDaysAgo)
    .slice(0, 5)

  return {
    totalFirms: firms.length,
    activeFirms,
    trialFirms,
    suspendedFirms,
    totalMembers,
    recentFirms,
  }
}