import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getCaseReport,
  createReport,
  updateReport,
  approveReport,
  deliverReport,
  type CreateReportData,
  type Report,
} from '@/services/reports'

export function useCaseReport(caseId: string) {
  const { user } = useAuth()
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const firmId = user?.firmId

  const load = useCallback(async () => {
    if (!firmId || !caseId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getCaseReport(firmId, caseId)
      setReport(data)
    } catch (err) {
      console.error(err)
      setError('Error al cargar el informe.')
    } finally {
      setLoading(false)
    }
  }, [firmId, caseId])

  useEffect(() => {
    load()
  }, [load])

  const create = async (data: CreateReportData): Promise<string | null> => {
    if (!firmId || !user) return null
    try {
      const id = await createReport(firmId, caseId, user.uid, data)
      await load()
      return id
    } catch (err) {
      console.error(err)
      setError('Error al crear el informe.')
      return null
    }
  }

  const update = async (reportId: string, data: Partial<CreateReportData>) => {
    if (!firmId) return
    try {
      await updateReport(firmId, caseId, reportId, data)
      await load()
    } catch (err) {
      console.error(err)
      setError('Error al actualizar el informe.')
    }
  }

  const approve = async (reportId: string) => {
    if (!firmId || !user) return
    try {
      await approveReport(firmId, caseId, reportId, user.uid)
      await load()
    } catch (err) {
      console.error(err)
      setError('Error al aprobar el informe.')
    }
  }

  const deliver = async (reportId: string, deliveredTo: string) => {
    if (!firmId) return
    try {
      await deliverReport(firmId, caseId, reportId, deliveredTo)
      await load()
    } catch (err) {
      console.error(err)
      setError('Error al entregar el informe.')
    }
  }

  return { report, loading, error, create, update, approve, deliver, reload: load }
}