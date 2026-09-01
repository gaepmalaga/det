import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getContacts,
  getContact,
  createContact,
  updateContact,
  type CreateContactData,
} from '@/services/contacts'
import type { Contact } from '@/types'

export function useContacts() {
  const { user } = useAuth()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const firmId = user?.firmId

  const load = useCallback(async () => {
    if (!firmId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getContacts(firmId)
      setContacts(data)
    } catch (err) {
      console.error(err)
      setError('Error al cargar los contactos.')
    } finally {
      setLoading(false)
    }
  }, [firmId])

  useEffect(() => {
    load()
  }, [load])

  const create = async (data: CreateContactData): Promise<string | null> => {
    if (!firmId || !user) return null
    try {
      const id = await createContact(firmId, user.uid, data)
      await load()
      return id
    } catch (err) {
      console.error(err)
      setError('Error al crear el contacto.')
      return null
    }
  }

  const update = async (contactId: string, data: Partial<CreateContactData>) => {
    if (!firmId) return
    try {
      await updateContact(firmId, contactId, data)
      await load()
    } catch (err) {
      console.error(err)
      setError('Error al actualizar el contacto.')
    }
  }

  return { contacts, loading, error, create, update, reload: load }
}

export function useContactDetail(contactId: string) {
  const { user } = useAuth()
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const firmId = user?.firmId

  const load = useCallback(async () => {
    if (!firmId || !contactId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getContact(firmId, contactId)
      setContact(data)
    } catch (err) {
      console.error(err)
      setError('Error al cargar el contacto.')
    } finally {
      setLoading(false)
    }
  }, [firmId, contactId])

  useEffect(() => {
    load()
  }, [load])

  return { contact, loading, error, reload: load }
}
