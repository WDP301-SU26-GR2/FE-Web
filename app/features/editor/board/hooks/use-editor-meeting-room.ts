import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

import type { BoardDecisionResDtoOutput } from '~/api/model/board'
import { readBoardSessionPhase } from '~/api/manual/board-meeting'
import type { BoardMessage, BoardSessionPhase } from '~/api/manual/board-meeting'
import { joinBoardSession, sendBoardMessage } from '~/api/manual/board-meeting-socket'
import {
  boardControllerGetDecisions,
  boardControllerGetSessionById,
  boardControllerGetSessionMessages
} from '~/api/operations/board/board'
import { env } from '~/shared/config/env'
import { STORAGE_KEYS } from '~/shared/config/site'
import { readStorage } from '~/shared/lib/storage'

type VoteProgress = Pick<
  BoardDecisionResDtoOutput,
  'approveCount' | 'rejectCount' | 'totalVotes' | 'quorumMet' | 'result'
> & { decisionId: string }

type VoteProgressPayload = Omit<VoteProgress, 'decisionId'> & { decisionId?: string; id?: string }

function getBoardNamespaceUrl() {
  if (typeof window === 'undefined') return ''
  if (!env.API_URL) return `${window.location.origin}/board`
  try {
    return `${new URL(env.API_URL, window.location.origin).origin}/board`
  } catch {
    return `${window.location.origin}/board`
  }
}

export function useEditorMeetingRoom({
  sessionId,
  initialPhase,
  initialMessages,
  initialDecisions
}: {
  sessionId: string
  initialPhase: BoardSessionPhase
  initialMessages: BoardMessage[]
  initialDecisions: BoardDecisionResDtoOutput[]
}) {
  const [phase, setPhase] = useState(initialPhase)
  const [messages, setMessages] = useState(initialMessages)
  const [baseDecisions, setBaseDecisions] = useState(initialDecisions)
  const [updates, setUpdates] = useState<Record<string, VoteProgress>>({})
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>(() =>
    readStorage(STORAGE_KEYS.accessToken) ? 'connecting' : 'disconnected'
  )
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const token = readStorage(STORAGE_KEYS.accessToken)
    const namespaceUrl = getBoardNamespaceUrl()
    if (!token || !namespaceUrl) return
    const socket = io(namespaceUrl, { auth: { token }, transports: ['polling', 'websocket'] })
    socketRef.current = socket
    const resync = async () => {
      const [session, messageResponse, decisionResponse] = await Promise.all([
        boardControllerGetSessionById({ id: sessionId }).catch(() => null),
        boardControllerGetSessionMessages({ id: sessionId }, { limit: 200, offset: 0 }).catch(() => null),
        boardControllerGetDecisions({ boardSessionId: sessionId }).catch(() => null)
      ])
      if (session?.status === 200) setPhase(readBoardSessionPhase(session.data))
      if (messageResponse?.status === 200) setMessages(messageResponse.data.items)
      if (decisionResponse?.status === 200) setBaseDecisions(decisionResponse.data)
    }
    socket.on('connect', () => {
      setConnectionState('connected')
      joinBoardSession(socket, sessionId, () => setConnectionState('disconnected'))
      void resync()
    })
    socket.on('disconnect', () => setConnectionState('disconnected'))
    socket.on('connect_error', () => setConnectionState('disconnected'))
    socket.on('messageReceived', (message: BoardMessage) => {
      if (message.sessionId !== sessionId) return
      setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]))
    })
    socket.on('phaseChanged', (payload: { sessionId: string; phase: BoardSessionPhase }) => {
      if (payload.sessionId === sessionId) setPhase(payload.phase)
    })
    socket.on('voteProgressUpdated', (progress: VoteProgressPayload) => {
      const decisionId = progress?.decisionId ?? progress?.id
      if (!decisionId) {
        void resync()
        return
      }
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
    void resync()
    const resyncTimer = window.setInterval(() => void resync(), 15_000)
    return () => {
      window.clearInterval(resyncTimer)
      socketRef.current = null
      socket.disconnect()
    }
  }, [sessionId])

  const sendMessage = useCallback(
    (content: string) => sendBoardMessage(socketRef.current, sessionId, content),
    [sessionId]
  )
  const updatePhase = useCallback((nextPhase: BoardSessionPhase) => setPhase(nextPhase), [])

  const decisions = useMemo(
    () => baseDecisions.map((decision) => (updates[decision.id] ? { ...decision, ...updates[decision.id] } : decision)),
    [baseDecisions, updates]
  )
  return { phase, messages, decisions, connectionState, sendMessage, updatePhase }
}
