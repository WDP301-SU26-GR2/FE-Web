import type { BoardDecisionResDtoOutput, BoardSessionResDtoOutput } from '~/api/model/board'

const sessionStatusOrder: Record<BoardSessionResDtoOutput['status'], number> = {
  ACTIVE: 0,
  UPCOMING: 1,
  CONCLUDED: 2
}

const decisionResultOrder: Record<NonNullable<BoardDecisionResDtoOutput['result']>, number> = {
  PENDING: 0,
  PENDING_QUORUM: 1,
  APPROVED: 2,
  REJECTED: 3,
  EXPIRED: 4
}

export function orderBoardSessions(sessions: BoardSessionResDtoOutput[]) {
  return [...sessions].sort((left, right) => {
    const statusDifference = sessionStatusOrder[left.status] - sessionStatusOrder[right.status]
    if (statusDifference !== 0) return statusDifference

    const timeDifference = new Date(left.startTime).getTime() - new Date(right.startTime).getTime()
    return left.status === 'CONCLUDED' ? -timeDifference : timeDifference
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
