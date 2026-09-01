import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getFrameworkContract,
  uploadFrameworkContract,
  setFrameworkContractStatus,
} from '@/services/frameworkContracts'
import { setClientFrameworkContract } from '@/services/clients'
import type { FrameworkContract } from '@/types'

export function useFrameworkContract(frameworkContractId: string | undefined) {
  const { user } = useAuth()
  const [contract, setContract] = useState<FrameworkContract | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const firmId = user?.firmId

  const load = useCallback(async () => {
    if (!firmId || !frameworkContractId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await getFrameworkContract(firmId, frameworkContractId)
      setContract(data)
    } catch (err) {
      console.error(err)
      setError('Error al cargar el contrato marco.')
    } finally {
      setLoading(false)
    }
  }, [firmId, frameworkContractId])

  useEffect(() => {
    load()
  }, [load])

  const upload = async (clientId: string, file: File, notes?: string): Promise<string | null> => {
    if (!firmId || !user) return null
    try {
      if (frameworkContractId) {
        await setFrameworkContractStatus(firmId, frameworkContractId, 'inactivo')
      }
      const id = await uploadFrameworkContract(firmId, user.uid, clientId, file, notes)
      await setClientFrameworkContract(firmId, clientId, id)
      return id
    } catch (err) {
      console.error(err)
      setError('Error al subir el contrato marco.')
      return null
    }
  }

  const deactivate = async () => {
    if (!firmId || !frameworkContractId) return
    try {
      await setFrameworkContractStatus(firmId, frameworkContractId, 'inactivo')
      await load()
    } catch (err) {
      console.error(err)
      setError('Error al desactivar el contrato marco.')
    }
  }

  return { contract, loading, error, upload, deactivate, reload: load }
}
