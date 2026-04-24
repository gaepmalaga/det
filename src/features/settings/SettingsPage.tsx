import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { FirmSettingsTab } from './FirmSettingsTab'
import { TeamTab } from './TeamTab'
import { TariffsTab } from './TariffsTab'
import { InvestigationTypesTab } from './InvestigationTypesTab'

const TABS = [
  { id: 'firm', label: 'Despacho' },
  { id: 'team', label: 'Equipo' },
  { id: 'tariffs', label: 'Tarifas' },
  { id: 'types', label: 'Tipos de investigación' },
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
      <div className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
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
    </div>
  )
}