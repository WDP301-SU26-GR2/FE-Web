import { useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'
import type { BoardDecisionResDtoOutput, BoardSessionResDtoOutput } from '~/api/model/board'
import { readBoardSessionPhase } from '~/api/manual/board-meeting'
import type { BoardSessionPhase } from '~/api/manual/board-meeting'
import { joinBoardSession } from '~/api/manual/board-meeting-socket'
import { env } from '~/shared/config/env'
import { STORAGE_KEYS } from '~/shared/config/site'
import { readStorage } from '~/shared/lib/storage'

type VoteProgress = Pick<
  BoardDecisionResDtoOutput,
  'approveCount' | 'rejectCount' | 'totalVotes' | 'quorumMet' | 'result'
> & { decisionId: string }

type VoteProgressPayload = Omit<VoteProgress, 'decisionId'> & { decisionId?: string; id?: string }

export type BoardRealtimeConnectionState = 'connecting' | 'connected' | 'disconnected'

function getBoardNamespaceUrl() {
  if (typeof window === 'undefined') return ''
  if (!env.API_URL) return `${window.location.origin}/board`
  try {
    return `${new URL(env.API_URL, window.location.origin).origin}/board`
  } catch {
    return `${window.location.origin}/board`
  }
}

export function useBoardSessionsRealtime(
  sessions: BoardSessionResDtoOutput[],
  decisions: BoardDecisionResDtoOutput[]
) {
  const [updates, setUpdates] = useState<Record<string, VoteProgress>>({})
  const [phaseUpdates, setPhaseUpdates] = useState<Record<string, BoardSessionPhase>>({})
  const [connectionState, setConnectionState] = useState<BoardRealtimeConnectionState>(() =>
    readStorage(STORAGE_KEYS.accessToken) ? 'connecting' : 'disconnected'
  )
  const sessionIds = useMemo(
    () => sessions.filter((session) => session.status === 'ACTIVE').map((session) => session.id),
    [sessions]
  )
  const sessionKey = sessionIds.join(',')

  useEffect(() => {
    const token = readStorage(STORAGE_KEYS.accessToken)
    const namespaceUrl = getBoardNamespaceUrl()
    if (!token || !namespaceUrl || !sessionKey) return

    const socket = io(namespaceUrl, { auth: { token }, transports: ['polling', 'websocket'] })
    socket.on('connect', () => {
      setConnectionState('connected')
      sessionIds.forEach((sessionId) => joinBoardSession(socket, sessionId, () => setConnectionState('disconnected')))
    })
    socket.on('disconnect', () => setConnectionState('disconnected'))
    socket.on('connect_error', () => setConnectionState('disconnected'))
    socket.on('phaseChanged', (payload: { sessionId: string; phase: BoardSessionPhase }) => {
      if (sessionIds.includes(payload.sessionId)) {
        setPhaseUpdates((current) => ({ ...current, [payload.sessionId]: payload.phase }))
      }
    })
    socket.on('voteProgressUpdated', (progress: VoteProgressPayload) => {
      const decisionId = progress?.decisionId ?? progress?.id
      if (!decisionId) return
      setUpdates((current) => ({
        ...current,
        [decisionId]: {
          decisionId,
          approveCount: progress.approveCount,
          rejectCount: progress.rejectCount,
          totalVotes: progress.totalVotes,
          quorumMet: progress.quorumMet,
          result: progress.result
        }
      }))
    })

    return () => {
      socket.disconnect()
    }
  }, [sessionIds, sessionKey])

  const liveDecisions = useMemo(
    () => decisions.map((decision) => (updates[decision.id] ? { ...decision, ...updates[decision.id] } : decision)),
    [decisions, updates]
  )
  const sessionPhases = useMemo(
    () =>
      Object.fromEntries(
        sessions.map((session) => [session.id, phaseUpdates[session.id] ?? readBoardSessionPhase(session)])
      ) as Record<string, BoardSessionPhase>,
    [phaseUpdates, sessions]
  )

  return { decisions: liveDecisions, sessionPhases, connectionState }
}
