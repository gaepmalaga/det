import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getFirm,
  getFirmMembers,
  updateFirm,
  updateCustomInvestigationTypes,
  updateFirmTariffs,
  updateContractTemplate,
  addMember,
  updateMember,
  type UpdateFirmData,
  type FirmTariffs,
  type InviteMemberData,
} from '@/services/firm'
import type { Firm, Member, TipStatus, ContractTemplate } from '@/types'

export function useFirm() {
  const { user } = useAuth()
  const [firm, setFirm] = useState<Firm | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const firmId = user?.firmId

  const load = useCallback(async () => {
    if (!firmId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getFirm(firmId)
      setFirm(data)
    } catch (err) {
      console.error(err)
      setError('Error al cargar los datos del despacho.')
    } finally {
      setLoading(false)
    }
  }, [firmId])

  useEffect(() => {
    load()
  }, [load])

  const update = async (data: UpdateFirmData) => {
    if (!firmId) return
    try {
      await updateFirm(firmId, data)
      await load()
    } catch (err) {
      console.error(err)
      setError('Error al actualizar el despacho.')
    }
  }

  const updateInvestigationTypes = async (types: string[]) => {
    if (!firmId) return
    try {
      await updateCustomInvestigationTypes(firmId, types)
      await load()
    } catch (err) {
      console.error(err)
      setError('Error al actualizar los tipos de investigación.')
    }
  }

  const updateTariffs = async (tariffs: FirmTariffs) => {
    if (!firmId) return
    try {
      await updateFirmTariffs(firmId, tariffs)
      await load()
    } catch (err) {
      console.error(err)
      setError('Error al actualizar las tarifas.')
    }
  }

  const updateTemplate = async (template: ContractTemplate) => {
    if (!firmId) return
    try {
      await updateContractTemplate(firmId, template)
      await load()
    } catch (err) {
      console.error(err)
      setError('Error al actualizar la plantilla de contrato.')
    }
  }

  return {
    firm,
    loading,
    error,
    update,
    updateInvestigationTypes,
    updateTariffs,
    updateTemplate,
    reload: load,
  }
}

export function useFirmMembers() {
  const { user } = useAuth()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const firmId = user?.firmId

  const load = useCallback(async () => {
    if (!firmId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getFirmMembers(firmId)
      setMembers(data)
    } catch (err) {
      console.error(err)
      setError('Error al cargar el equipo.')
    } finally {
      setLoading(false)
    }
  }, [firmId])

  useEffect(() => {
    load()
  }, [load])

  const add = async (data: InviteMemberData): Promise<string | null> => {
    if (!firmId) return null
    try {
      const id = await addMember(firmId, data)
      await load()
      return id
    } catch (err) {
      console.error(err)
      setError('Error al añadir el miembro.')
      return null
    }
  }

  const update = async (
    memberId: string,
    data: Partial<InviteMemberData> & { isActive?: boolean; tipStatus?: TipStatus }
  ) => {
    if (!firmId) return
    try {
      await updateMember(firmId, memberId, data)
      await load()
    } catch (err) {
      console.error(err)
      setError('Error al actualizar el miembro.')
    }
  }

  return { members, loading, error, add, update, reload: load }
}