import type { Firm } from '@/types'
import type { Collaborator } from './collaborators'

function firmDisplayName(firm: Firm): string {
  return firm.tradeName || firm.legalName
}

function firmAddressLine(firm: Firm): string {
  const a = firm.registeredAddress
  return `${a.street}, ${a.postalCode} ${a.city} (${a.province})`
}

// Plantilla por defecto del contrato de colaboración entre despachos de
// detectives (subcontratación de servicios de investigación, Ley 5/2014).
// Solo aplica a colaboradores independientes — un colaborador dependiente
// trabaja bajo la estructura del propio despacho y no lo necesita.
export function buildDefaultCollaborationContractBody(
  firm: Firm,
  collaborator: Collaborator
): string {
  return `CONTRATO DE COLABORACIÓN ENTRE DESPACHOS DE DETECTIVES PRIVADOS

Entre ${firmDisplayName(firm)} (NIF/CIF ${firm.taxId}, Nº RNSP ${firm.rnsp}, con domicilio en ${firmAddressLine(firm)}), en adelante "el Despacho Contratante", y ${collaborator.legalName}${collaborator.taxId ? ` (NIF/CIF ${collaborator.taxId})` : ''} (Nº RNSP ${collaborator.rnsp}${collaborator.tipNumber ? `, TIP ${collaborator.tipNumber}` : ''}${collaborator.address ? `, con domicilio en ${collaborator.address}` : ''}), en adelante "el Colaborador", acuerdan lo siguiente:

PRIMERA. Objeto
El Despacho Contratante podrá encomendar al Colaborador, de forma puntual y para expedientes concretos, la realización de actuaciones de investigación privada dentro del ámbito de su habilitación conforme a la Ley 5/2014, de Seguridad Privada, y su normativa de desarrollo.

SEGUNDA. Régimen de actuación
El Colaborador actúa como profesional o despacho independiente, con su propia habilitación y responsabilidad, y no como personal dependiente del Despacho Contratante. Cada actuación encomendada quedará documentada en el expediente correspondiente, incluyendo la identificación del Colaborador como interviniente.

TERCERA. Confidencialidad y protección de datos
Ambas partes se comprometen a guardar secreto profesional sobre la información conocida con motivo de la colaboración, y a tratar los datos personales a los que tengan acceso conforme al Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018, de Protección de Datos Personales y garantía de los derechos digitales, limitando su uso exclusivamente a los fines de la investigación encomendada.

CUARTA. Responsabilidad
Cada parte responde de las actuaciones realizadas dentro de su propio ámbito de actuación, sin perjuicio de la responsabilidad que corresponda al Despacho Contratante frente al cliente final del servicio.

QUINTA. Duración
El presente contrato tiene carácter de marco de colaboración y permanece vigente mientras ambas partes no manifiesten lo contrario, aplicándose a cada expediente concreto que se asigne al Colaborador durante su vigencia.

Firmado electrónicamente por ambas partes.`
}
