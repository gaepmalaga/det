import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getContracts,
  getContractsByCase,
  createContract,
  markContractAsSigned,
  updateContractStatus,
  uploadContractDocument,
  updateContract,
  type CreateContractData,
  type ContractStatus,
  type Contract,
} from '@/services/contracts'

export function useContracts() {
  const { user } = useAuth()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const firmId = user?.firmId

  const load = useCallback(async () => {
    if (!firmId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getContracts(firmId)
      setContracts(data)
    } catch (err) {
      console.error(err)
      setError('Error al cargar los contratos.')
    } finally {
      setLoading(false)
    }
  }, [firmId])

  useEffect(() => {
    load()
  }, [load])

  const create = async (data: CreateContractData): Promise<string | null> => {
    if (!firmId || !user) return null
    try {
      const id = await createContract(firmId, user.uid, data)
      await load()
      return id
    } catch (err) {
      console.error(err)
      setError('Error al crear el contrato.')
      return null
    }
  }

  const sign = async (contractId: string, signedByName: string) => {
    if (!firmId) return
    try {
      await markContractAsSigned(firmId, contractId, signedByName)
      await load()
    } catch (err) {
      console.error(err)
      setError('Error al firmar el contrato.')
    }
  }

  const changeStatus = async (contractId: string, status: ContractStatus) => {
    if (!firmId) return
    try {
      await updateContractStatus(firmId, contractId, status)
      await load()
    } catch (err) {
      console.error(err)
      setError('Error al actualizar el estado.')
    }
  }

  const uploadDocument = async (contractId: string, file: File): Promise<string | null> => {
    if (!firmId) return null
    try {
      const url = await uploadContractDocument(firmId, contractId, file)
      await load()
      return url
    } catch (err) {
      console.error(err)
      setError('Error al subir el documento.')
      return null
    }
  }

  return { contracts, loading, error, create, sign, changeStatus, uploadDocument, reload: load }
}

export function useCaseContracts(caseId: string) {
  const { user } = useAuth()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const firmId = user?.firmId

  const load = useCallback(async () => {
    if (!firmId || !caseId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getContractsByCase(firmId, caseId)
      setContracts(data)
    } catch (err) {
      console.error(err)
      setError('Error al cargar los contratos.')
    } finally {
      setLoading(false)
    }
  }, [firmId, caseId])

  useEffect(() => {
    load()
  }, [load])

  const create = async (data: CreateContractData): Promise<string | null> => {
    if (!firmId || !user) return null
    try {
      const id = await createContract(firmId, user.uid, data)
      await load()
      return id
    } catch (err) {
      console.error(err)
      setError('Error al crear el contrato.')
      return null
    }
  }

  const sign = async (contractId: string, signedByName: string) => {
    if (!firmId) return
    try {
      await markContractAsSigned(firmId, contractId, signedByName)
      await load()
    } catch (err) {
      console.error(err)
      setError('Error al firmar el contrato.')
    }
  }

  const uploadDocument = async (contractId: string, file: File): Promise<string | null> => {
    if (!firmId) return null
    try {
      const url = await uploadContractDocument(firmId, contractId, file)
      await load()
      return url
    } catch (err) {
      console.error(err)
      setError('Error al subir el documento.')
      return null
    }
  }

  return { contracts, loading, error, create, sign, uploadDocument, reload: load }
}