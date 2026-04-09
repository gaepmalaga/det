import { cn } from '@/lib/utils'
import type { CaseStatus, LeadStatus } from '@/types'
import {
  CASE_STATUS_COLORS,
  CASE_STATUS_LABELS,
  LEAD_STATUS_COLORS,
  LEAD_STATUS_LABELS,
} from '@/constants/cases'

interface LeadStatusBadgeProps {
  status: LeadStatus
  className?: string
}

export function LeadStatusBadge({ status, className }: LeadStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
        LEAD_STATUS_COLORS[status],
        className
      )}
    >
      {LEAD_STATUS_LABELS[status]}
    </span>
  )
}

interface CaseStatusBadgeProps {
  status: CaseStatus
  className?: string
}

export function CaseStatusBadge({ status, className }: CaseStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
        CASE_STATUS_COLORS[status],
        className
      )}
    >
      {CASE_STATUS_LABELS[status]}
    </span>
  )
}