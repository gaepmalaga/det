import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getCollaboratorIndex, type CollaboratorMembership } from '@/services/collaborators'
import { getCasesForCollaborator, getCase } from '@/services/cases'
import type { Case } from '@/types'

export interface CollaboratedCase {
  case: Case
  membership: CollaboratorMembership
}

export function useCollaboratePortal() {
  const { firebaseUser } = useAuth()
  const [items, setItems] = useState<CollaboratedCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!firebaseUser?.uid) return

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const memberships = await getCollaboratorIndex(firebaseUser.uid)
        const perFirm = await Promise.all(
          memberships.map(async (m) => {
            const cases = await getCasesForCollaborator(m.firmId, m.collaboratorId)
            return cases.map((c) => ({ case: c, membership: m }))
          })
        )
        setItems(perFirm.flat())
      } catch (err) {
        console.error(err)
        setError('Error al cargar tus colaboraciones.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [firebaseUser])

  return { items, loading, error }
}

export function useCollaboratedCaseDetail(firmId: string | undefined, caseId: string | undefined) {
  const [caseData, setCaseData] = useState<Case | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!firmId || !caseId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getCase(firmId, caseId)
      setCaseData(data)
    } catch (err) {
      console.error(err)
      setError('Error al cargar el expediente.')
    } finally {
      setLoading(false)
    }
  }, [firmId, caseId])

  useEffect(() => {
    load()
  }, [load])

  return { caseData, loading, error, reload: load }
}
