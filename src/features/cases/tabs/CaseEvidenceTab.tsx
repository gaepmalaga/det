import { useState, useRef } from 'react'
import { Plus, Paperclip, Image, FileText, Mic, MapPin, Trash2, Eye } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { createAuditLog } from '@/services/auditLog'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore'
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import type { Case, EvidenceType, EvidenceVisibility } from '@/types'

interface Evidence {
  id: string
  type: EvidenceType
  description: string
  fileUrl?: string
  fileName?: string
  fileSize?: number
  visibility: EvidenceVisibility
  obtainedAt: Date
  detectiveName: string
  createdAt: Date
}

const TYPE_ICONS: Record<EvidenceType, React.ReactNode> = {
  photo: <Image className="w-4 h-4" />,
  video: <Eye className="w-4 h-4" />,
  audio: <Mic className="w-4 h-4" />,
  document: <FileText className="w-4 h-4" />,
  geolocation: <MapPin className="w-4 h-4" />,
  other: <Paperclip className="w-4 h-4" />,
}

const TYPE_LABELS: Record<EvidenceType, string> = {
  photo: 'Fotografía',
  video: 'Vídeo',
  audio: 'Audio',
  document: 'Documento',
  geolocation: 'Geolocalización',
  other: 'Otro',
}

interface CaseEvidenceTabProps {
  caseData: Case
}

export function CaseEvidenceTab({ caseData }: CaseEvidenceTabProps) {
  const { user } = useAuth()
  const [evidences, setEvidences] = useState<Evidence[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    type: 'photo' as EvidenceType,
    description: '',
    visibility: 'internal' as EvidenceVisibility,
    obtainedAt: new Date().toISOString().split('T')[0],
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const firmId = user?.firmId

  const load = async () => {
    if (!firmId) return
    setLoading(true)
    try {
      const colRef = collection(db, 'firms', firmId, 'cases', caseData.id, 'evidence')
      const q = query(colRef, orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      const data = snap.docs.map((d) => {
        const ev = d.data()
        return {
          id: d.id,
          type: ev.type as EvidenceType,
          description: ev.description as string,
          fileUrl: ev.fileUrl as string | undefined,
          fileName: ev.fileName as string | undefined,
          fileSize: ev.fileSize as number | undefined,
          visibility: ev.visibility as EvidenceVisibility,
          obtainedAt: ev.obtainedAt instanceof Timestamp ? ev.obtainedAt.toDate() : new Date(),
          detectiveName: ev.detectiveName as string,
          createdAt: ev.createdAt instanceof Timestamp ? ev.createdAt.toDate() : new Date(),
        }
      })
      setEvidences(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useState(() => {
    load()
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setSelectedFile(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firmId || !user) return
    setUploading(true)
    try {
      let fileUrl: string | undefined
      let fileName: string | undefined
      let fileSize: number | undefined

      if (selectedFile) {
        const storageRef = ref(
          storage,
          `firms/${firmId}/cases/${caseData.id}/evidence/${Date.now()}_${selectedFile.name}`
        )
        await uploadBytes(storageRef, selectedFile)
        fileUrl = await getDownloadURL(storageRef)
        fileName = selectedFile.name
        fileSize = selectedFile.size
      }

      const cleanData: Record<string, unknown> = {
        type: form.type,
        description: form.description,
        visibility: form.visibility,
        obtainedAt: Timestamp.fromDate(new Date(form.obtainedAt + 'T12:00:00')),
        detectiveId: user.uid,
        detectiveName: user.displayName || '',
        detectiveTip: '',
        hasActiveException: false,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      }

      if (fileUrl) cleanData.fileUrl = fileUrl
      if (fileName) cleanData.fileName = fileName
      if (fileSize) cleanData.fileSize = fileSize

      await addDoc(
        collection(db, 'firms', firmId, 'cases', caseData.id, 'evidence'),
        cleanData
      )

      await createAuditLog(
        firmId,
        caseData.id,
        user.uid,
        user.displayName || '',
        'evidence_added',
        'Evidencia añadida: ' + form.description,
        { type: form.type, visibility: form.visibility }
      )

      setForm({
        type: 'photo',
        description: '',
        visibility: 'internal',
        obtainedAt: new Date().toISOString().split('T')[0],
      })
      setSelectedFile(null)
      setShowForm(false)
      await load()
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (evidenceId: string) => {
    if (!firmId || !user) return
    if (!confirm('¿Eliminar esta evidencia?')) return
    try {
      await deleteDoc(doc(db, 'firms', firmId, 'cases', caseData.id, 'evidence', evidenceId))

      await createAuditLog(
        firmId,
        caseData.id,
        user.uid,
        user.displayName || '',
        'evidence_deleted',
        'Evidencia eliminada'
      )

      await load()
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) return <LoadingSpinner />

  const isClosed = caseData.status === 'cerrado' || caseData.status === 'archivado'
  const canAdd = ['activo', 'suspendido', 'trabajo_terminado'].includes(caseData.status)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Evidencias</h3>
          <p className="text-xs text-slate-500 mt-0.5">{evidences.length} evidencias registradas</p>
        </div>
        {canAdd && !isClosed && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Añadir evidencia
          </button>
        )}
      </div>

      {!canAdd && !isClosed && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800">
            Las evidencias solo pueden añadirse cuando el expediente está activo.
          </p>
        </div>
      )}

      {showForm && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-slate-900 mb-4">Nueva evidencia</h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Tipo</label>
                <select
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                >
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Visibilidad</label>
                <select
                  name="visibility"
                  value={form.visibility}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                >
                  <option value="internal">Solo interna</option>
                  <option value="client">Visible al cliente</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Fecha de obtención <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="obtainedAt"
                value={form.obtainedAt}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Descripción <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                required
                rows={2}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none focus:border-primary"
                placeholder="Describe la evidencia..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Archivo{' '}
                <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              {selectedFile ? (
                <div className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-lg">
                  <Paperclip className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-700 truncate">{selectedFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="ml-auto text-xs text-slate-400 hover:text-red-500"
                  >
                    Quitar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-slate-400 transition-colors"
                >
                  <Paperclip className="w-4 h-4" />
                  Seleccionar archivo
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {uploading ? 'Guardando...' : 'Añadir evidencia'}
              </button>
            </div>
          </form>
        </div>
      )}

      {evidences.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
            <Paperclip className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-900 mb-1">Sin evidencias</p>
          <p className="text-xs text-slate-500">
            Añade fotografías, vídeos, documentos y otros materiales de la investigación.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {evidences.map((ev) => (
            <div key={ev.id} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                    {TYPE_ICONS[ev.type]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="text-sm font-medium text-slate-900">{TYPE_LABELS[ev.type]}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${
                        ev.visibility === 'client'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        {ev.visibility === 'client' ? 'Visible al cliente' : 'Interna'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{ev.description}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {format(ev.obtainedAt, 'dd MMM yyyy', { locale: es })} · {ev.detectiveName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {ev.fileUrl && (
                    <a href={ev.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                      Ver archivo
                    </a>
                  )}
                  {!isClosed && (
                    <button
                      onClick={() => handleDelete(ev.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}