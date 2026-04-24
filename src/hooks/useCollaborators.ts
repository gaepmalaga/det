import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getCollaborators,
  getCollaborator,
  createCollaborator,
  updateCollaborator,
  type Collaborator,
  type CreateCollaboratorData,
  type CollaboratorStatus,
} from '@/services/collaborators'

export function useCollaborators() {
  const { user } = useAuth()
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const firmId = user?.firmId

  const load = useCallback(async () => {
    if (!firmId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getCollaborators(firmId)
      setCollaborators(data)
    } catch (err) {
      console.error(err)
      setError('Error al cargar los colaboradores.')
    } finally {
      setLoading(false)
    }
  }, [firmId])

  useEffect(() => {
    load()
  }, [load])

  const create = async (data: CreateCollaboratorData): Promise<string | null> => {
    if (!firmId || !user) return null
    try {
      const id = await createCollaborator(firmId, user.uid, data)
      await load()
      return id
    } catch (err) {
      console.error(err)
      setError('Error al crear el colaborador.')
      return null
    }
  }

  const update = async (
    collaboratorId: string,
    data: Partial<CreateCollaboratorData> & { status?: CollaboratorStatus }
  ) => {
    if (!firmId) return
    try {
      await updateCollaborator(firmId, collaboratorId, data)
      await load()
    } catch (err) {
      console.error(err)
      setError('Error al actualizar el colaborador.')
    }
  }

  return { collaborators, loading, error, create, update, reload: load }
}

export function useCollaboratorDetail(collaboratorId: string) {
  const { user } = useAuth()
  const [collaborator, setCollaborator] = useState<Collaborator | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const firmId = user?.firmId

  const load = useCallback(async () => {
    if (!firmId || !collaboratorId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getCollaborator(firmId, collaboratorId)
      setCollaborator(data)
    } catch (err) {
      console.error(err)
      setError('Error al cargar el colaborador.')
    } finally {
      setLoading(false)
    }
  }, [firmId, collaboratorId])

  useEffect(() => {
    load()
  }, [load])

  return { collaborator, loading, error, reload: load }
}