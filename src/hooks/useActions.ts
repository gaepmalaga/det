import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getCaseActions,
  createAction,
  updateActionDescription,
  deleteAction,
  type CreateActionData,
} from '@/services/actions'
import type { CaseAction } from '@/types'

export function useCaseActions(caseId: string) {
  const { user } = useAuth()
  const [actions, setActions] = useState<CaseAction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const firmId = user?.firmId

  const load = useCallback(async () => {
    if (!firmId || !caseId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getCaseActions(firmId, caseId)
      setActions(data)
    } catch (err) {
      console.error(err)
      setError('Error al cargar las actuaciones.')
    } finally {
      setLoading(false)
    }
  }, [firmId, caseId])

  useEffect(() => {
    load()
  }, [load])

  const create = async (data: CreateActionData): Promise<string | null> => {
    if (!firmId || !user) return null
    try {
      const id = await createAction(firmId, caseId, user.uid, data)
      await load()
      return id
    } catch (err) {
      console.error(err)
      setError('Error al crear la actuación.')
      return null
    }
  }

  const updateDescription = async (actionId: string, description: string) => {
    if (!firmId) return
    try {
      await updateActionDescription(firmId, caseId, actionId, description)
      await load()
    } catch (err) {
      console.error(err)
      setError('Error al actualizar la actuación.')
    }
  }

  const remove = async (actionId: string) => {
    if (!firmId) return
    try {
      await deleteAction(firmId, caseId, actionId)
      await load()
    } catch (err) {
      console.error(err)
      setError('Error al eliminar la actuación.')
    }
  }

  return { actions, loading, error, create, updateDescription, remove, reload: load }
}
