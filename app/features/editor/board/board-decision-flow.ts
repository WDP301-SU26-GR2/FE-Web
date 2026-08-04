export const BOARD_SESSION_DECISION_TYPES = [
  'SERIALIZATION',
  'CONTINUE',
  'CANCELLATION',
  'FORMAT_CHANGE',
  'COMPLETION',
  'CONTRACT',
  'TRANSFER'
] as const

export type BoardSessionDecisionType = (typeof BOARD_SESSION_DECISION_TYPES)[number]

const ENDING_DECISION_TYPES = new Set<BoardSessionDecisionType>(['CANCELLATION', 'COMPLETION'])

type DecisionForConflictCheck = {
  targetSeriesId?: string | null
  decisionType?: string | null
  details?: {
    resourceId?: unknown
    versionId?: unknown
    transferRequestId?: unknown
  } | null
}

export type BoardDecisionConflictTarget = {
  seriesId: string
  decisionType: BoardSessionDecisionType
  resourceId?: string
  versionId?: string
  transferRequestId?: string
}

export function isBoardSessionDecisionType(value: string): value is BoardSessionDecisionType {
  return BOARD_SESSION_DECISION_TYPES.some((decisionType) => decisionType === value)
}

export function hasBoardDecisionConflict(
  decisions: readonly DecisionForConflictCheck[],
  target: BoardDecisionConflictTarget
): boolean {
  return decisions.some((decision) => {
    if (decision.targetSeriesId !== target.seriesId) return false

    if (target.decisionType === 'CONTRACT') {
      return (
        decision.decisionType === 'CONTRACT' &&
        decision.details?.resourceId === target.resourceId &&
        (decision.details?.versionId ?? '') === (target.versionId ?? '')
      )
    }

    if (target.decisionType === 'TRANSFER') {
      return decision.decisionType === 'TRANSFER' && decision.details?.transferRequestId === target.transferRequestId
    }

    if (decision.decisionType === target.decisionType) return true
    return (
      ENDING_DECISION_TYPES.has(target.decisionType) &&
      ENDING_DECISION_TYPES.has(decision.decisionType as BoardSessionDecisionType)
    )
  })
}
