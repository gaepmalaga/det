export const CONTRACT_PLACEHOLDERS: { key: string; label: string }[] = [
  { key: 'cliente_nombre', label: 'Nombre del cliente' },
  { key: 'cliente_dni', label: 'DNI/NIF del cliente' },
  { key: 'cliente_domicilio', label: 'Domicilio del cliente' },
  { key: 'objeto', label: 'Objeto de la investigación' },
  { key: 'importe', label: 'Importe acordado' },
  { key: 'fecha', label: 'Fecha' },
  { key: 'despacho_nombre', label: 'Nombre del despacho' },
  { key: 'despacho_rnsp', label: 'Nº RNSP del despacho' },
]

export type ContractTemplateVars = Record<string, string>

export function renderContractTemplate(body: string, vars: ContractTemplateVars): string {
  return CONTRACT_PLACEHOLDERS.reduce((text, { key }) => {
    const value = vars[key] ?? ''
    return text.replaceAll(`{{${key}}}`, value)
  }, body)
}
