import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getQuotes,
  getQuotesByContact,
  createQuote,
  rejectQuote,
  acceptQuote,
  uploadQuoteDocument,
  type CreateQuoteData,
  type AcceptQuoteData,
} from '@/services/quotes'
import type { Quote } from '@/types'

export function useQuotes() {
  const { user } = useAuth()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const firmId = user?.firmId

  const load = useCallback(async () => {
    if (!firmId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getQuotes(firmId)
      setQuotes(data)
    } catch (err) {
      console.error(err)
      setError('Error al cargar los presupuestos.')
    } finally {
      setLoading(false)
    }
  }, [firmId])

  useEffect(() => {
    load()
  }, [load])

  const create = async (data: CreateQuoteData): Promise<string | null> => {
    if (!firmId || !user) return null
    try {
      const id = await createQuote(firmId, user.uid, data)
      await load()
      return id
    } catch (err) {
      console.error(err)
      setError('Error al crear el presupuesto.')
      return null
    }
  }

  const reject = async (quoteId: string, rejectionReason?: string) => {
    if (!firmId) return
    try {
      await rejectQuote(firmId, quoteId, rejectionReason)
      await load()
    } catch (err) {
      console.error(err)
      setError('Error al rechazar el presupuesto.')
    }
  }

  const accept = async (quoteId: string, data: AcceptQuoteData) => {
    if (!firmId) return
    try {
      await acceptQuote(firmId, quoteId, data)
      await load()
    } catch (err) {
      console.error(err)
      setError('Error al aceptar el presupuesto.')
    }
  }

  const uploadDocument = async (quoteId: string, file: File): Promise<string | null> => {
    if (!firmId) return null
    try {
      const url = await uploadQuoteDocument(firmId, quoteId, file)
      await load()
      return url
    } catch (err) {
      console.error(err)
      setError('Error al subir el documento.')
      return null
    }
  }

  return { quotes, loading, error, create, reject, accept, uploadDocument, reload: load }
}

export function useContactQuotes(contactId: string) {
  const { user } = useAuth()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const firmId = user?.firmId

  const load = useCallback(async () => {
    if (!firmId || !contactId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getQuotesByContact(firmId, contactId)
      setQuotes(data)
    } catch (err) {
      console.error(err)
      setError('Error al cargar los presupuestos.')
    } finally {
      setLoading(false)
    }
  }, [firmId, contactId])

  useEffect(() => {
    load()
  }, [load])

  const create = async (data: CreateQuoteData): Promise<string | null> => {
    if (!firmId || !user) return null
    try {
      const id = await createQuote(firmId, user.uid, data)
      await load()
      return id
    } catch (err) {
      console.error(err)
      setError('Error al crear el presupuesto.')
      return null
    }
  }

  const reject = async (quoteId: string, rejectionReason?: string) => {
    if (!firmId) return
    try {
      await rejectQuote(firmId, quoteId, rejectionReason)
      await load()
    } catch (err) {
      console.error(err)
      setError('Error al rechazar el presupuesto.')
    }
  }

  const accept = async (quoteId: string, data: AcceptQuoteData) => {
    if (!firmId) return
    try {
      await acceptQuote(firmId, quoteId, data)
      await load()
    } catch (err) {
      console.error(err)
      setError('Error al aceptar el presupuesto.')
    }
  }

  const uploadDocument = async (quoteId: string, file: File): Promise<string | null> => {
    if (!firmId) return null
    try {
      const url = await uploadQuoteDocument(firmId, quoteId, file)
      await load()
      return url
    } catch (err) {
      console.error(err)
      setError('Error al subir el documento.')
      return null
    }
  }

  return { quotes, loading, error, create, reject, accept, uploadDocument, reload: load }
}
