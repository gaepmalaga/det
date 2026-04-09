import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getLeads,
  getLead,
  createLead,
  updateLeadStatus,
  updateLead,
  type CreateLeadData,
} from '@/services/leads'
import type { Lead, LeadStatus } from '@/types'

export function useLeads() {
  const { user } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const firmId = user?.firmId

  const load = useCallback(async () => {
    if (!firmId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getLeads(firmId)
      setLeads(data)
    } catch (err) {
      console.error(err)
      setError('Error al cargar las solicitudes.')
    } finally {
      setLoading(false)
    }
  }, [firmId])

  useEffect(() => {
    load()
  }, [load])

  const create = async (data: CreateLeadData): Promise<string | null> => {
    if (!firmId || !user) return null
    try {
      const id = await createLead(firmId, user.uid, data)
      await load()
      return id
    } catch (err) {
      console.error(err)
      setError('Error al crear la solicitud.')
      return null
    }
  }

  const changeStatus = async (
    leadId: string,
    status: LeadStatus,
    extra?: { rejectionReason?: string; notes?: string }
  ) => {
    if (!firmId) return
    try {
      await updateLeadStatus(firmId, leadId, status, extra)
      await load()
    } catch (err) {
      console.error(err)
      setError('Error al actualizar el estado.')
    }
  }

  const update = async (leadId: string, data: Partial<CreateLeadData>) => {
    if (!firmId) return
    try {
      await updateLead(firmId, leadId, data)
      await load()
    } catch (err) {
      console.error(err)
      setError('Error al actualizar la solicitud.')
    }
  }

  return { leads, loading, error, create, changeStatus, update, reload: load }
}

export function useLeadDetail(leadId: string) {
  const { user } = useAuth()
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const firmId = user?.firmId

  useEffect(() => {
    if (!firmId || !leadId) return
    setLoading(true)
    getLead(firmId, leadId)
      .then(setLead)
      .catch(() => setError('Error al cargar la solicitud.'))
      .finally(() => setLoading(false))
  }, [firmId, leadId])

  return { lead, loading, error }
}