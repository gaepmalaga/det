import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Case, ComplianceStatus } from '@/types'

export interface ComplianceAlert {
  caseId: string
  caseNumber: string
  investigationType: string
  status: ComplianceStatus
  issues: string[]
}

export async function getFirmComplianceAlerts(firmId: string): Promise<ComplianceAlert[]> {
  const ref = collection(db, 'firms', firmId, 'cases')
  const q = query(ref, where('status', 'in', ['revision', 'presupuesto', 'contrato_pendiente', 'activo', 'suspendido', 'trabajo_terminado']))
  const snap = await getDocs(q)

  const alerts: ComplianceAlert[] = []

  snap.docs.forEach((d) => {
    const data = d.data() as Record<string, unknown>
    const issues = (data.complianceIssues as string[]) || []
    const status = (data.complianceStatus as ComplianceStatus) || 'amber'

    if (issues.length > 0 || status !== 'green') {
      alerts.push({
        caseId: d.id,
        caseNumber: data.caseNumber as string,
        investigationType: data.investigationType as string,
        status,
        issues,
      })
    }
  })

  return alerts.sort((a, b) => {
    const order = { red: 0, amber: 1, green: 2 }
    return order[a.status] - order[b.status]
  })
}