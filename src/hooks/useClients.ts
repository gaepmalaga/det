import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getClients,
  getClient,
  createClient,
  updateClient,
  type CreateClientData,
} from '@/services/clients'
import type { Client } from '@/types'

export function useClients() {
  const { user } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const firmId = user?.firmId

  const load = useCallback(async () => {
    if (!firmId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getClients(firmId)
      setClients(data)
    } catch (err) {
      console.error(err)
      setError('Error al cargar los clientes.')
    } finally {
      setLoading(false)
    }
  }, [firmId])

  useEffect(() => {
    load()
  }, [load])

  const create = async (data: CreateClientData): Promise<string | null> => {
    if (!firmId || !user) return null
    try {
      const id = await createClient(firmId, user.uid, data)
      await load()
      return id
    } catch (err) {
      console.error(err)
      setError('Error al crear el cliente.')
      return null
    }
  }

  const update = async (clientId: string, data: Partial<CreateClientData>) => {
    if (!firmId) return
    try {
      await updateClient(firmId, clientId, data)
      await load()
    } catch (err) {
      console.error(err)
      setError('Error al actualizar el cliente.')
    }
  }

  return { clients, loading, error, create, update, reload: load }
}

export function useClientDetail(clientId: string) {
  const { user } = useAuth()
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const firmId = user?.firmId

  const load = useCallback(async () => {
    if (!firmId || !clientId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getClient(firmId, clientId)
      setClient(data)
    } catch (err) {
      console.error(err)
      setError('Error al cargar el cliente.')
    } finally {
      setLoading(false)
    }
  }, [firmId, clientId])

  useEffect(() => {
    load()
  }, [load])

  return { client, loading, error, reload: load }
}