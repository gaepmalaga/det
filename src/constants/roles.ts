import type { FirmMemberRole } from '@/types'

export const ROLE_LABELS: Record<FirmMemberRole, string> = {
  firm_owner: 'Titular',
  firm_director: 'Director / Gerente',
  detective_senior: 'Detective Senior',
  detective_junior: 'Detective Junior',
  admin_staff: 'Administrativo',
  compliance_officer: 'Responsable de Cumplimiento',
}

export const DETECTIVE_ROLES: FirmMemberRole[] = [
  'firm_owner',
  'detective_senior',
  'detective_junior',
]

export const ROLES_REQUIRING_TIP: FirmMemberRole[] = [
  'firm_owner',
  'detective_senior',
  'detective_junior',
]

export const PLAN_TRIAL = 'trial'
export const PLAN_BASIC = 'basic'
export const PLAN_PRO = 'pro'