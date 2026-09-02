import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { FirmSettingsTab } from './FirmSettingsTab'
import { TeamTab } from './TeamTab'
import { TariffsTab } from './TariffsTab'
import { InvestigationTypesTab } from './InvestigationTypesTab'
import { ContractTemplateTab } from './ContractTemplateTab'
import { RegistryBookTab } from './RegistryBookTab'
import { DemoDataTab } from './DemoDataTab'

const TABS = [
  { id: 'firm', label: 'Despacho' },
  { id: 'team', label: 'Equipo' },
  { id: 'tariffs', label: 'Tarifas' },
  { id: 'types', label: 'Tipos de investigación' },
  { id: 'contract', label: 'Plantilla de contrato' },
  { id: 'registry', label: 'Libro-registro' },
  { id: 'demo', label: 'Demostración' },
]

export function SettingsPage() {
  // En la URL, para poder enlazar directamente a una pestaña — /app/team
  // llevaba a un aviso de "en construcción" cuando Equipo ya vivía aquí
  // desde el rediseño de la navegación; ahora redirige a esta pestaña.
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('tab')
  const activeTab = TABS.some((t) => t.id === requested) ? requested! : 'firm'
  const setActiveTab = (tab: string) =>
    setSearchParams(tab === 'firm' ? {} : { tab }, { replace: true })

  return (
    <div>
      <PageHeader
        title="Configuración"
        description="Gestiona los datos, equipo y preferencias del despacho."
      />

      {/* Tabs — scroll horizontal en móvil */}
      <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'firm' && <FirmSettingsTab />}
      {activeTab === 'team' && <TeamTab />}
      {activeTab === 'tariffs' && <TariffsTab />}
      {activeTab === 'types' && <InvestigationTypesTab />}
      {activeTab === 'contract' && <ContractTemplateTab />}
      {activeTab === 'registry' && <RegistryBookTab />}
      {activeTab === 'demo' && <DemoDataTab />}
    </div>
  )
}