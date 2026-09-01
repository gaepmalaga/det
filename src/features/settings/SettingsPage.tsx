import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { FirmSettingsTab } from './FirmSettingsTab'
import { TeamTab } from './TeamTab'
import { TariffsTab } from './TariffsTab'
import { InvestigationTypesTab } from './InvestigationTypesTab'
import { ContractTemplateTab } from './ContractTemplateTab'

const TABS = [
  { id: 'firm', label: 'Despacho' },
  { id: 'team', label: 'Equipo' },
  { id: 'tariffs', label: 'Tarifas' },
  { id: 'types', label: 'Tipos de investigación' },
  { id: 'contract', label: 'Plantilla de contrato' },
]

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('firm')

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
    </div>
  )
}