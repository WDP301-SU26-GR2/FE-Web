export type ContractDisplayPhase = 'DRAFT' | 'BOARD_REVIEW' | 'MANGAKA_REVIEW' | 'PENDING_ACTIVATION' | 'COMPLETE'

const AMENDMENT_HISTORY_STATUSES = new Set([
  'FULLY_EXECUTED',
  'FULFILLED',
  'TERMINATED',
  'TERMINATED_BY_BREACH',
  'EXPIRED'
])

export function getContractDisplayFlow(status: string | null | undefined): {
  phase: ContractDisplayPhase
  canRespond: boolean
  showSigningStatus: true
} {
  if (status === 'AWAITING_MANGAKA') return { phase: 'MANGAKA_REVIEW', canRespond: true, showSigningStatus: true }
  if (status === 'BOARD_REVIEW') return { phase: 'BOARD_REVIEW', canRespond: false, showSigningStatus: true }
  if (status === 'ACTIVATION_PENDING')
    return { phase: 'PENDING_ACTIVATION', canRespond: false, showSigningStatus: true }
  if (AMENDMENT_HISTORY_STATUSES.has(status ?? ''))
    return { phase: 'COMPLETE', canRespond: false, showSigningStatus: true }
  return { phase: 'DRAFT', canRespond: false, showSigningStatus: true }
}

export function isAmendmentHistoryAvailable(status: string | null | undefined): boolean {
  return AMENDMENT_HISTORY_STATUSES.has(status ?? '')
}
