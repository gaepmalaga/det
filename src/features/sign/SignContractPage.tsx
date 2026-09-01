import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle, FileText } from 'lucide-react'
import { getContractForSigning, signContractPublicly } from '@/services/contracts'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Contract } from '@/services/contracts'

async function fetchPublicIp(): Promise<string | null> {
  try {
    const res = await fetch('https://api.ipify.org?format=json')
    if (!res.ok) return null
    const data = await res.json()
    return typeof data.ip === 'string' ? data.ip : null
  } catch {
    return null
  }
}

export function SignContractPage() {
  const { firmId, contractId } = useParams<{ firmId: string; contractId: string }>()
  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [signedByName, setSignedByName] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [signing, setSigning] = useState(false)
  const [justSigned, setJustSigned] = useState(false)

  useEffect(() => {
    if (!firmId || !contractId) return
    getContractForSigning(firmId, contractId)
      .then((data) => {
        if (!data) {
          setNotFound(true)
        } else {
          setContract(data)
        }
      })
      .catch((err) => {
        console.error(err)
        setNotFound(true)
      })
      .finally(() => setLoading(false))
  }, [firmId, contractId])

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firmId || !contractId || !signedByName.trim() || !accepted) return
    setSigning(true)
    try {
      const ip = await fetchPublicIp()
      await signContractPublicly(firmId, contractId, signedByName.trim(), ip)
      setJustSigned(true)
    } finally {
      setSigning(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <p className="text-sm text-slate-400">Cargando...</p>
      </div>
    )
  }

  if (notFound || !contract) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <p className="text-sm text-slate-500">
            Este enlace de firma no es válido o el contrato ya no está disponible.
          </p>
        </div>
      </div>
    )
  }

  const isSigned = contract.status === 'firmado' || justSigned

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 mb-4">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">
            {isSigned ? 'Contrato firmado' : 'Firma del contrato'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {contract.contractNumber} — {contract.clientName}
          </p>
        </div>

        {isSigned ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-50 mb-4">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-sm font-medium text-slate-900 mb-1">
              Firma registrada correctamente
            </p>
            {contract.signedAt && (
              <p className="text-xs text-slate-500">
                {contract.signedByName ?? signedByName} — {format(contract.signedAt ?? new Date(), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
              </p>
            )}
            <p className="text-xs text-slate-400 mt-4">
              Ya puedes cerrar esta página. El despacho recibirá la confirmación.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-4 max-h-96 overflow-y-auto">
              {contract.bodyText ? (
                <p className="text-sm text-slate-800 whitespace-pre-wrap font-mono">
                  {contract.bodyText}
                </p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Servicio</p>
                    <p className="text-sm text-slate-900 whitespace-pre-wrap">
                      {contract.serviceDescription}
                    </p>
                  </div>
                  {contract.agreedPrice && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Precio acordado</p>
                      <p className="text-sm text-slate-900">{contract.agreedPrice}</p>
                    </div>
                  )}
                  {contract.specificConditions && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Condiciones específicas</p>
                      <p className="text-sm text-slate-900 whitespace-pre-wrap">
                        {contract.specificConditions}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <form onSubmit={handleSign} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Nombre completo <span className="text-red-500">*</span>
                </label>
                <input
                  value={signedByName}
                  onChange={(e) => setSignedByName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Tu nombre y apellidos"
                />
              </div>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-xs text-slate-600">
                  He leído el contrato y acepto sus términos. Entiendo que al firmar
                  se registrará mi nombre, la fecha, la hora y mi dirección IP.
                </span>
              </label>

              <button
                type="submit"
                disabled={signing || !signedByName.trim() || !accepted}
                className="w-full px-4 py-2.5 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {signing ? 'Firmando...' : 'Firmar contrato'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
