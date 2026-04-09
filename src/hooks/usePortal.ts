import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getCasePortalAccess,
  createPortalAccess,
  revokePortalAccess,
  getCasePortalDocuments,
  releaseDocument,
  getCaseMessages,
  sendMessage,
  getClientPortalData,
  updatePortalClientUserId,
  type PortalAccess,
  type PortalDocument,
  type PortalMessage,
} from '@/services/portal'
import { getCase } from '@/services/cases'
import type { Case } from '@/types'

export function useCasePortal(caseId: string) {
  const { user } = useAuth()
  const [accesses, setAccesses] = useState<PortalAccess[]>([])
  const [documents, setDocuments] = useState<PortalDocument[]>([])
  const [messages, setMessages] = useState<PortalMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const firmId = user?.firmId

  const load = useCallback(async () => {
    if (!firmId || !caseId) return
    setLoading(true)
    setError(null)
    try {
      const [acc, docs, msgs] = await Promise.all([
        getCasePortalAccess(firmId, caseId),
        getCasePortalDocuments(firmId, caseId),
        getCaseMessages(firmId, caseId),
      ])
      setAccesses(acc)
      setDocuments(docs)
      setMessages(msgs)
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

  const release = async (doc: { name: string; url: string; type: PortalDocument['type'] }) => {
    if (!firmId || !user) return
    try {
      await releaseDocument(firmId, caseId, user.uid, doc)
      await load()
    } catch (err) {
      console.error(err)
      setError('Error al liberar el documento.')
    }
  }

  const send = async (content: string, fromClient: boolean, senderName: string) => {
    if (!firmId) return
    try {
      await sendMessage(firmId, caseId, content, fromClient, senderName)
      await load()
    } catch (err) {
      console.error(err)
      setError('Error al enviar el mensaje.')
    }
  }

  return {
    accesses,
    documents,
    messages,
    loading,
    error,
    grantAccess,
    revokeAccess,
    release,
    send,
    reload: load,
  }
}

export function useClientPortal() {
  const { user, firebaseUser } = useAuth()
  const [cases, setCases] = useState<Case[]>([])
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
            if (c) return c
          }
          return null
        })

        const results = await Promise.all(casePromises)
        setCases(results.filter(Boolean) as Case[])
      } catch (err) {
        console.error(err)
        setError('Error al cargar tus expedientes.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [firebaseUser])

  return { cases, loading, error, hasAccess }
}