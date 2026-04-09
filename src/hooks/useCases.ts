import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getCases,
  getCase,
  createCase,
  updateCaseStatus,
  updateCase,
  type CreateCaseData,
} from '@/services/cases'
import type { Case, CaseStatus } from '@/types'

export function useCases() {
  const { user } = useAuth()
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const firmId = user?.firmId

  const load = useCallback(async () => {
    if (!firmId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getCases(firmId)
      setCases(data)
    } catch (err) {
      console.error(err)
      setError('Error al cargar los expedientes.')
    } finally {
      setLoading(false)
    }
  }, [firmId])

  useEffect(() => {
    load()
  }, [load])

  const create = async (data: CreateCaseData): Promise<string | null> => {
    if (!firmId || !user) return null
    try {
      const id = await createCase(firmId, user.uid, data)
      await load()
      return id
    } catch (err) {
      console.error(err)
      setError('Error al crear el expediente.')
      return null
    }
  }

  const changeStatus = async (
    caseId: string,
    newStatus: CaseStatus,
    reason?: string
  ) => {
    if (!firmId || !user) return
    try {
      await updateCaseStatus(firmId, caseId, newStatus, user.uid, reason)
      await load()
    } catch (err) {
      console.error(err)
      setError('Error al actualizar el estado.')
    }
  }

  const update = async (caseId: string, data: Partial<CreateCaseData>) => {
    if (!firmId) return
    try {
      await updateCase(firmId, caseId, data)
      await load()
    } catch (err) {
      console.error(err)
      setError('Error al actualizar el expediente.')
    }
  }

  return { cases, loading, error, create, changeStatus, update, reload: load }
}

export function useCaseDetail(caseId: string) {
  const { user } = useAuth()
  const [caseData, setCaseData] = useState<Case | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const firmId = user?.firmId

  useEffect(() => {
    if (!firmId || !caseId) return
    setLoading(true)
    getCase(firmId, caseId)
      .then(setCaseData)
      .catch(() => setError('Error al cargar el expediente.'))
      .finally(() => setLoading(false))
  }, [firmId, caseId])

  return { caseData, loading, error }
}