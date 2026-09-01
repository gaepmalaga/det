import { cn } from '@/lib/utils'
import type { CaseStatus, QuoteStatus } from '@/types'
import {
  CASE_STATUS_COLORS,
  CASE_STATUS_LABELS,
  QUOTE_STATUS_COLORS,
  QUOTE_STATUS_LABELS,
} from '@/constants/cases'

interface QuoteStatusBadgeProps {
  status: QuoteStatus
  className?: string
}

export function QuoteStatusBadge({ status, className }: QuoteStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
        QUOTE_STATUS_COLORS[status],
        className
      )}
    >
      {QUOTE_STATUS_LABELS[status]}
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