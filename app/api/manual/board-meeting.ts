import { customFetch } from '~/api/mutator/custom-fetch'

/** Temporary Spec 16 contract. Replace with Orval exports after Swagger is regenerated. */
export type BoardSessionPhase = 'PRESENTING' | 'QA' | 'VOTING'

export type BoardMessage = {
  id: string
  sessionId: string
  sender: { id: string; displayName: string | null; avatar: string | null }
  content: string
  phase: BoardSessionPhase
  createdAt: string
}

type BoardMessagesResponse = {
  data: { items: BoardMessage[]; total: number }
  status: number
}

type AdvancePhaseResponse = {
  data: { id: string; phase: BoardSessionPhase }
  status: number
}

export function getBoardSessionMessages(sessionId: string, limit = 200, offset = 0) {
  return customFetch<BoardMessagesResponse>(`/board/sessions/${encodeURIComponent(sessionId)}/messages`, {
    method: 'GET',
    params: { limit, offset }
  })
}

export function advanceBoardSessionPhase(sessionId: string, phase: Exclude<BoardSessionPhase, 'PRESENTING'>) {
  return customFetch<AdvancePhaseResponse>(`/board/sessions/${encodeURIComponent(sessionId)}/phase`, {
    method: 'PATCH',
    data: { phase }
  })
}

export function readBoardSessionPhase(session: unknown): BoardSessionPhase {
  if (session && typeof session === 'object' && 'phase' in session) {
    const phase = (session as { phase?: unknown }).phase
    if (phase === 'PRESENTING' || phase === 'QA' || phase === 'VOTING') return phase
  }
  return 'PRESENTING'
}
