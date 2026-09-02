import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Fingerprint } from 'lucide-react'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { ROUTES } from '@/constants/routes'
import { PLAN_TRIAL } from '@/constants/roles'
import type { LegalType } from '@/types'

export function OnboardingPage() {
  const { user, firebaseUser, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    legalType: 'individual' as LegalType,
    legalName: '',
    tradeName: '',
    taxId: '',
    rnsp: '',
    tipNumber: '',
    street: '',
    city: '',
    province: '',
    postalCode: '',
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !firebaseUser) return

    if (!form.rnsp.trim()) {
      setError('El número RNSP es obligatorio.')
      return
    }
    if (!form.tipNumber.trim()) {
      setError('El número de TIP es obligatorio.')
      return
    }
    if (!form.legalName.trim()) {
      setError('El nombre o razón social es obligatorio.')
      return
    }
    if (!form.street.trim() || !form.city.trim() || !form.province.trim() || !form.postalCode.trim()) {
      setError('La dirección de la sede es obligatoria.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const firmId = crypto.randomUUID()
      const memberId = user.uid

      await setDoc(doc(db, 'firms', firmId), {
        legalType: form.legalType,
        legalName: form.legalName.trim(),
        tradeName: form.tradeName.trim() || null,
        taxId: form.taxId.trim(),
        rnsp: form.rnsp.trim().toUpperCase(),
        registeredAddress: {
          street: form.street.trim(),
          city: form.city.trim(),
          province: form.province.trim(),
          postalCode: form.postalCode.trim(),
          country: 'España',
        },
        titular: {
          memberId,
          tipNumber: form.tipNumber.trim().toUpperCase(),
          tipExpiry: null,
        },
        customInvestigationTypes: [],
        status: 'trial',
        planId: PLAN_TRIAL,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      await setDoc(doc(db, 'firms', firmId, 'members', memberId), {
        userId: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: 'firm_owner',
        tipNumber: form.tipNumber.trim().toUpperCase(),
        tipExpiry: null,
        tipStatus: 'active',
        dependencyType: 'owner',
        preferences: {
          autoAssignAsDetective: false,
        },
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      await setDoc(doc(db, 'userFirmIndex', user.uid), {
        firmId,
        memberId,
        role: 'firm_owner',
        firmStatus: 'trial',
        updatedAt: serverTimestamp(),
      })

      await refreshUser()
      navigate(ROUTES.TODAY)
    } catch (err) {
      console.error(err)
      setError('Error al crear el despacho. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary mb-4">
            <Fingerprint className="w-6 h-6 text-primary-foreground" strokeWidth={2} />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            Configura tu despacho
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Esta información es necesaria para operar legalmente en la plataforma.
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Forma jurídica
              </label>
              <select
                name="legalType"
                value={form.legalType}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="individual">Empresario individual / Autónomo</option>
                <option value="company">Persona jurídica (Sociedad)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                {form.legalType === 'individual' ? 'Nombre completo' : 'Razón social'}
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <input
                name="legalName"
                value={form.legalName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder={
                  form.legalType === 'individual'
                    ? 'Juan García López'
                    : 'Investigaciones García S.L.'
                }
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Nombre comercial{' '}
                <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <input
                name="tradeName"
                value={form.tradeName}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Despacho García Investigaciones"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                {form.legalType === 'individual' ? 'DNI / NIE' : 'CIF'}
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <input
                name="taxId"
                value={form.taxId}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary uppercase"
                placeholder={form.legalType === 'individual' ? '12345678A' : 'B12345678'}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Número RNSP
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <input
                name="rnsp"
                value={form.rnsp}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary uppercase"
                placeholder="D-XXXX"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Número de registro en el Registro Nacional de Seguridad Privada.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Número de TIP del titular
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <input
                name="tipNumber"
                value={form.tipNumber}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary uppercase"
                placeholder="D-XXXX"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Tarjeta de Identidad Profesional de detective privado habilitado.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Dirección de la sede
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <input
                name="street"
                value={form.street}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary mb-2"
                placeholder="Calle, número, piso..."
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  required
                  className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Ciudad"
                />
                <input
                  name="province"
                  value={form.province}
                  onChange={handleChange}
                  required
                  className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Provincia"
                />
              </div>
              <input
                name="postalCode"
                value={form.postalCode}
                onChange={handleChange}
                required
                className="w-full mt-2 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Código postal"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creando despacho...' : 'Crear despacho y acceder'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Estos datos pueden modificarse después desde Configuración.
        </p>
      </div>
    </div>
  )
}