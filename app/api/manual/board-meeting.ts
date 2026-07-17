import type {
  BoardDecisionResDtoOutput,
  BoardMessageListResDtoOutputItemsItem,
  BoardSessionResDtoOutput
} from '~/api/model/board'

export type BoardSessionPhase = BoardSessionResDtoOutput['phase']
export type BoardMessage = BoardMessageListResDtoOutputItemsItem
export type BoardMeetingSession = BoardSessionResDtoOutput
export type BoardMeetingDecision = BoardDecisionResDtoOutput

export function readBoardSessionPhase(session: unknown): BoardSessionPhase {
  if (session && typeof session === 'object' && 'phase' in session) {
    const phase = (session as { phase?: unknown }).phase
    if (phase === 'PRESENTING' || phase === 'QA' || phase === 'VOTING') return phase
  }
  return 'PRESENTING'
}
