import type { BoardDecisionResDtoOutput, BoardSessionResDtoOutput } from '~/api/model/board'

const decisionResultOrder: Record<NonNullable<BoardDecisionResDtoOutput['result']>, number> = {
  PENDING: 0,
  PENDING_QUORUM: 1,
  APPROVED: 2,
  REJECTED: 3,
  EXPIRED: 4
}

export function orderBoardSessions(sessions: BoardSessionResDtoOutput[]) {
  return [...sessions].sort((left, right) => {
    // Phiên đang họp (ACTIVE) luôn ưu tiên lên đầu.
    if (left.status === 'ACTIVE' && right.status !== 'ACTIVE') return -1
    if (right.status === 'ACTIVE' && left.status !== 'ACTIVE') return 1

    // Còn lại (UPCOMING, CONCLUDED) — xếp trình tự mới → cũ theo createdAt.
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  })
}

export function orderBoardDecisions(decisions: BoardDecisionResDtoOutput[]) {
  return [...decisions].sort((left, right) => {
    const leftOrder = decisionResultOrder[left.result ?? 'PENDING']
    const rightOrder = decisionResultOrder[right.result ?? 'PENDING']
    if (leftOrder !== rightOrder) return leftOrder - rightOrder

    return new Date(left.createdAt ?? 0).getTime() - new Date(right.createdAt ?? 0).getTime()
  })
}