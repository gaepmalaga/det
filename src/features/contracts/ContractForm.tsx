import { useState, useEffect, useCallback } from 'react'
import { X, Sparkles } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getFirm } from '@/services/firm'
import { getClient } from '@/services/clients'
import { renderContractTemplate } from '@/lib/contractTemplate'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Client, Firm } from '@/types'
import type { CreateContractData, ContractType } from '@/services/contracts'

interface ContractFormProps {
  open: boolean
  onClose: () => void
  onCreate: (data: CreateContractData) => Promise<void>
  defaultClientName?: string
  defaultServiceDescription?: string
  caseId?: string
  clientId?: string
}

const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  servicio_cliente: 'Prestación de servicios',
  marco_colaboracion: 'Marco de colaboración',
  marco_corporativo: 'Marco corporativo',
}

export function ContractForm({
  open,
  onClose,
  onCreate,
  defaultClientName = '',
  defaultServiceDescription = '',
  caseId,
  clientId,
}: ContractFormProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [firm, setFirm] = useState<Firm | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [form, setForm] = useState({
    type: 'servicio_cliente' as ContractType,
    clientName: defaultClientName,
    serviceDescription: defaultServiceDescription,
    agreedPrice: '',
    specificConditions: '',
    bodyText: '',
  })

  const buildVars = useCallback(
    (agreedPrice: string) => ({
      cliente_nombre: client?.legalName ?? form.clientName,
      cliente_dni: client?.taxId ?? '',
      cliente_domicilio: client?.address
        ? [client.address.street, client.address.city].filter(Boolean).join(', ')
        : '',
      objeto: form.serviceDescription,
      importe: agreedPrice,
      fecha: format(new Date(), 'dd/MM/yyyy', { locale: es }),
      despacho_nombre: firm?.legalName ?? '',
      despacho_rnsp: firm?.rnsp ?? '',
    }),
    [client, firm, form.clientName, form.serviceDescription]
  )

  useEffect(() => {
    if (!open || !user?.firmId) return
    setLoading(true)
    Promise.all([
      getFirm(user.firmId),
      clientId ? getClient(user.firmId, clientId) : Promise.resolve(null),
    ])
      .then(([firmData, clientData]) => {
        setFirm(firmData)
        setClient(clientData)
      })
      .finally(() => setLoading(false))
  }, [open, user?.firmId, clientId])

  const template = firm?.contractTemplate
  const hasTemplate = Boolean(template?.body)

  useEffect(() => {
    if (!hasTemplate || loading) return
    setForm((prev) => ({
      ...prev,
      bodyText: renderContractTemplate(template!.body, buildVars(prev.agreedPrice)),
    }))
    // Solo al cargar los datos — no se re-sincroniza automáticamente al escribir
    // para no pisar ediciones manuales del texto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasTemplate, loading])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const regenerate = () => {
    if (!template) return
    setForm((prev) => ({
      ...prev,
      bodyText: renderContractTemplate(template.body, buildVars(prev.agreedPrice)),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onCreate({
        type: form.type,
        clientName: client?.legalName || form.clientName,
        serviceDescription: form.serviceDescription,
        agreedPrice: form.agreedPrice || undefined,
        specificConditions: form.specificConditions || undefined,
        bodyText: hasTemplate ? form.bodyText : undefined,
        caseId,
        clientId,
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Nuevo contrato</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Tipo de contrato
            </label>
            <select
              name="type"
              value={form.type}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              {Object.entries(CONTRACT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {!client && (
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Cliente <span className="text-red-500">*</span>
              </label>
              <input
                name="clientName"
                value={form.clientName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Nombre del cliente o empresa"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Descripción del servicio <span className="text-red-500">*</span>
            </label>
            <textarea
              name="serviceDescription"
              value={form.serviceDescription}
              onChange={handleChange}
              required
              rows={2}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none focus:border-primary"
              placeholder="Describe el servicio contratado..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Precio acordado{' '}
              <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <input
              name="agreedPrice"
              value={form.agreedPrice}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="Ej: 1.200€"
            />
          </div>

          {loading ? (
            <p className="text-xs text-muted-foreground">Cargando plantilla del despacho...</p>
          ) : hasTemplate ? (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-foreground">
                  Texto del contrato — generado desde la plantilla del despacho
                </label>
                <button
                  type="button"
                  onClick={regenerate}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Regenerar desde plantilla
                </button>
              </div>
              <textarea
                name="bodyText"
                value={form.bodyText}
                onChange={handleChange}
                rows={12}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y focus:border-primary font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Revisa el texto antes de enviarlo al cliente para su firma.
              </p>
            </div>
          ) : (
            <>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-800">
                  Tu despacho no tiene una plantilla de contrato configurada — este contrato se
                  creará solo con estos datos. Ve a Ajustes → Plantilla de contrato para crear
                  una y generar el texto completo automáticamente la próxima vez.
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Condiciones específicas{' '}
                  <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <textarea
                  name="specificConditions"
                  value={form.specificConditions}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none focus:border-primary"
                  placeholder="Condiciones particulares del contrato..."
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || loading}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creando...' : 'Crear contrato'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
