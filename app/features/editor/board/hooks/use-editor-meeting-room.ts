import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

import type { BoardDecisionResDtoOutput } from '~/api/model/board'
import { getBoardSessionMessages, readBoardSessionPhase } from '~/api/manual/board-meeting'
import type { BoardMessage, BoardSessionPhase } from '~/api/manual/board-meeting'
import { boardControllerGetDecisions, boardControllerGetSessionById } from '~/api/operations/board/board'
import { env } from '~/shared/config/env'
import { STORAGE_KEYS } from '~/shared/config/site'
import { readStorage } from '~/shared/lib/storage'

type VoteProgress = Pick<
  BoardDecisionResDtoOutput,
  'approveCount' | 'rejectCount' | 'totalVotes' | 'quorumMet' | 'result'
> & { decisionId: string }

type SendAck = { status: 'SUCCESS' | 'DENIED' | 'ERROR'; message?: BoardMessage; reason?: string }

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
    const socket = io(namespaceUrl, { auth: { token }, transports: ['websocket', 'polling'] })
    socketRef.current = socket
    const resync = async () => {
      const [session, messageResponse, decisionResponse] = await Promise.all([
        boardControllerGetSessionById({ id: sessionId }).catch(() => null),
        getBoardSessionMessages(sessionId).catch(() => null),
        boardControllerGetDecisions().catch(() => null)
      ])
      if (session?.status === 200) setPhase(readBoardSessionPhase(session.data))
      if (messageResponse?.status === 200) setMessages(messageResponse.data.items)
      if (decisionResponse?.status === 200)
        setBaseDecisions(decisionResponse.data.filter((decision) => decision.boardSessionId === sessionId))
    }
    socket.on('connect', () => {
      socket.emit('joinSession', { sessionId }, (ack: { status?: string }) => {
        setConnectionState(ack?.status === 'SUCCESS' ? 'connected' : 'disconnected')
        if (ack?.status === 'SUCCESS') void resync()
      })
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
    socket.on('voteProgressUpdated', (progress: VoteProgress) => {
      if (progress?.decisionId) setUpdates((current) => ({ ...current, [progress.decisionId]: progress }))
    })
    return () => {
      socketRef.current = null
      socket.disconnect()
    }
  }, [sessionId])

  const sendMessage = useCallback(
    (content: string) =>
      new Promise<SendAck>((resolve) => {
        const socket = socketRef.current
        if (!socket?.connected) resolve({ status: 'ERROR', reason: 'DISCONNECTED' })
        else socket.emit('sendMessage', { sessionId, content }, resolve)
      }),
    [sessionId]
  )

  const decisions = useMemo(
    () => baseDecisions.map((decision) => (updates[decision.id] ? { ...decision, ...updates[decision.id] } : decision)),
    [baseDecisions, updates]
  )
  return { phase, messages, decisions, connectionState, sendMessage }
}
