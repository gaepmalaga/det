import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getCasePortalAccess,
  createPortalAccess,
  revokePortalAccess,
  getClientPortalData,
  updatePortalClientUserId,
  type PortalAccess,
} from '@/services/portal'
import { getCase } from '@/services/cases'
import { getQuote } from '@/services/quotes'
import type { Case, Quote } from '@/types'

export function useCasePortal(caseId: string) {
  const { user } = useAuth()
  const [accesses, setAccesses] = useState<PortalAccess[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const firmId = user?.firmId

  const load = useCallback(async () => {
    if (!firmId || !caseId) return
    setLoading(true)
    setError(null)
    try {
      const acc = await getCasePortalAccess(firmId, caseId)
      setAccesses(acc)
    } catch (err) {
      console.error(err)
      setError('Error al cargar el portal.')
    } finally {
      setLoading(false)
    }
  }, [firmId, caseId])

  useEffect(() => {
    load()
  }, [load])

  const grantAccess = async (
    caseNumber: string,
    clientEmail: string,
    clientName: string
  ) => {
    if (!firmId || !user) return
    try {
      await createPortalAccess(firmId, caseId, caseNumber, user.uid, clientEmail, clientName)
      await load()
    } catch (err) {
      console.error(err)
      setError('Error al crear el acceso.')
    }
  }

  const revokeAccess = async (accessId: string) => {
    if (!firmId) return
    try {
      await revokePortalAccess(firmId, caseId, accessId)
      await load()
    } catch (err) {
      console.error(err)
      setError('Error al revocar el acceso.')
    }
  }

  return { accesses, loading, error, grantAccess, revokeAccess, reload: load }
}

export interface PortalCaseSummary {
  case: Case
  quote: Quote | null
}

export function useClientPortal() {
  const { firebaseUser } = useAuth()
  const [items, setItems] = useState<PortalCaseSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    if (!firebaseUser?.email) return

    const load = async () => {
      setLoading(true)
      try {
        const portalData = await getClientPortalData(firebaseUser.email!)
        if (!portalData) {
          setHasAccess(false)
          setLoading(false)
          return
        }

        setHasAccess(true)

        if (firebaseUser.uid) {
          await updatePortalClientUserId(firebaseUser.email!, firebaseUser.uid)
        }

        const casePromises = portalData.caseIds.map(async (caseId) => {
          for (const firmId of portalData.firmIds) {
            const c = await getCase(firmId, caseId)
            if (c) {
              const quote = c.quoteId ? await getQuote(firmId, c.quoteId) : null
              return { case: c, quote }
            }
          }
          return null
        })

        const results = await Promise.all(casePromises)
        setItems(results.filter(Boolean) as PortalCaseSummary[])
      } catch (err) {
        console.error(err)
        setError('Error al cargar tus expedientes.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [firebaseUser])

  return { items, loading, error, hasAccess }
}
