import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

import type { BoardDecisionResDtoOutput } from '~/api/model/board'
import { readBoardSessionPhase } from '~/api/manual/board-meeting'
import type { BoardMessage, BoardSessionPhase } from '~/api/manual/board-meeting'
import { joinBoardSession, sendBoardMessage } from '~/api/manual/board-meeting-socket'
import {
  boardControllerGetDecisionDetails,
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
  const [baseDecisions, setBaseDecisions] = useState<BoardDecisionResDtoOutput[]>(initialDecisions)
  const [decisionDetailsMap, setDecisionDetailsMap] = useState<Record<string, BoardDecisionResDtoOutput>>(() => {
    const map: Record<string, BoardDecisionResDtoOutput> = {}
    initialDecisions.forEach((decision) => {
      if (decision.id) {
        map[decision.id] = decision
      }
    })
    return map
  })
  const [updates, setUpdates] = useState<Record<string, VoteProgress>>({})
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>(() =>
    readStorage(STORAGE_KEYS.accessToken) ? 'connecting' : 'disconnected'
  )
  const socketRef = useRef<Socket | null>(null)
  const resyncInFlightRef = useRef(false)
  const resyncTimerRef = useRef<number | null>(null)
  const flushTimerRef = useRef<number | null>(null)
  const pendingMessagesRef = useRef<BoardMessage[]>([])
  const pendingPhaseRef = useRef<BoardSessionPhase | null>(null)
  const pendingVoteUpdatesRef = useRef<Record<string, VoteProgress>>({})

  useEffect(() => {
    const token = readStorage(STORAGE_KEYS.accessToken)
    const namespaceUrl = getBoardNamespaceUrl()
    if (!token || !namespaceUrl) return
    const socket = io(namespaceUrl, { auth: { token }, transports: ['polling', 'websocket'] })
    socketRef.current = socket
    const resync = async () => {
      if (resyncInFlightRef.current) return
      resyncInFlightRef.current = true
      try {
        const [session, messageResponse, decisionResponse] = await Promise.all([
          boardControllerGetSessionById({ id: sessionId }).catch(() => null),
          boardControllerGetSessionMessages({ id: sessionId }, { limit: 200, offset: 0 }).catch(() => null),
          boardControllerGetDecisions({ boardSessionId: sessionId }).catch(() => null)
        ])
        if (session?.status === 200) setPhase(readBoardSessionPhase(session.data))
        if (messageResponse?.status === 200) setMessages(messageResponse.data.items)
        if (decisionResponse?.status === 200) {
          const decisionsList = decisionResponse.data
          const detailsMap: Record<string, BoardDecisionResDtoOutput> = {}
          decisionsList.forEach((decision) => {
            if (decision.id) {
              detailsMap[decision.id] = decision as BoardDecisionResDtoOutput
            }
          })
          setBaseDecisions(decisionsList as BoardDecisionResDtoOutput[])
          setDecisionDetailsMap((prev) => ({ ...prev, ...detailsMap }))
        }
      } finally {
        resyncInFlightRef.current = false
      }
    }
    let lastResyncTime = 0
    const requestResync = () => {
      const now = Date.now()
      if (now - lastResyncTime < 5000) return // Cooldown 5s
      if (resyncTimerRef.current != null) return // Đã có timer đang chờ
      lastResyncTime = now
      resyncTimerRef.current = window.setTimeout(() => {
        resyncTimerRef.current = null
        void resync()
      }, 1000)
    }
    const handleFocus = () => requestResync()
    const flushRealtimeUpdates = () => {
      flushTimerRef.current = null
      const nextMessages = pendingMessagesRef.current
      const nextPhase = pendingPhaseRef.current
      const nextVotes = pendingVoteUpdatesRef.current
      pendingMessagesRef.current = []
      pendingPhaseRef.current = null
      pendingVoteUpdatesRef.current = {}
      if (nextPhase) setPhase(nextPhase)
      if (nextMessages.length > 0) {
        setMessages((current) => {
          const seen = new Set(current.map((item) => item.id))
          const additions = nextMessages.filter((item) => !seen.has(item.id))
          return additions.length > 0 ? [...current, ...additions] : current
        })
      }
      if (Object.keys(nextVotes).length > 0) setUpdates((current) => ({ ...current, ...nextVotes }))
    }
    const scheduleRealtimeFlush = () => {
      if (flushTimerRef.current != null) return
      flushTimerRef.current = window.setTimeout(flushRealtimeUpdates, 300)
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') requestResync()
    }
    socket.on('connect', () => {
      setConnectionState('connected')
      joinBoardSession(socket, sessionId, () => setConnectionState('disconnected'))
      requestResync()
    })
    socket.on('disconnect', () => setConnectionState('disconnected'))
    socket.on('connect_error', () => setConnectionState('disconnected'))
    socket.on('messageReceived', (message: BoardMessage) => {
      if (message.sessionId !== sessionId) return
      pendingMessagesRef.current.push(message)
      scheduleRealtimeFlush()
    })
    socket.on('phaseChanged', (payload: { sessionId: string; phase: BoardSessionPhase }) => {
      if (payload.sessionId === sessionId) {
        pendingPhaseRef.current = payload.phase
        scheduleRealtimeFlush()
      }
    })
    socket.on('voteProgressUpdated', (progress: VoteProgressPayload) => {
      const decisionId = progress?.decisionId ?? progress?.id
      if (!decisionId) {
        requestResync()
        return
      }
      pendingVoteUpdatesRef.current[decisionId] = {
        decisionId,
        approveCount: progress.approveCount,
        rejectCount: progress.rejectCount,
        totalVotes: progress.totalVotes,
        quorumMet: progress.quorumMet,
        result: progress.result
      }
      scheduleRealtimeFlush()
    })
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      if (resyncTimerRef.current != null) window.clearTimeout(resyncTimerRef.current)
      if (flushTimerRef.current != null) window.clearTimeout(flushTimerRef.current)
      resyncTimerRef.current = null
      flushTimerRef.current = null
      pendingMessagesRef.current = []
      pendingPhaseRef.current = null
      pendingVoteUpdatesRef.current = {}
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      socketRef.current = null
      socket.disconnect()
    }
  }, [sessionId])

  const sendMessage = useCallback(
    (content: string) => sendBoardMessage(socketRef.current, sessionId, content),
    [sessionId]
  )
  const updatePhase = useCallback((nextPhase: BoardSessionPhase) => setPhase(nextPhase), [])
  const addDecision = useCallback((decision: BoardDecisionResDtoOutput) => {
    setBaseDecisions((current) => (current.some((item) => item.id === decision.id) ? current : [...current, decision]))
    setDecisionDetailsMap((prev) => {
      if (decision.id) {
        return { ...prev, [decision.id]: decision }
      }
      return prev
    })
  }, [])
  const loadDecisionDetail = useCallback(async (decisionId: string) => {
    const cached = decisionDetailsMap[decisionId]
    if (cached) return cached
    const response = await boardControllerGetDecisionDetails({ id: decisionId }).catch(() => null)
    if (response?.status === 200) {
      const detail = response.data
      setDecisionDetailsMap((prev) => ({ ...prev, [decisionId]: detail }))
      return detail
    }
    return null
  }, [decisionDetailsMap])
  const refreshDecisions = useCallback(async () => {
    const response = await boardControllerGetDecisions({ boardSessionId: sessionId }).catch(() => null)
    if (response?.status === 200) {
      const decisionsList = response.data
      const detailsMap: Record<string, BoardDecisionResDtoOutput> = {}
      decisionsList.forEach((decision) => {
        if (decision.id) {
          detailsMap[decision.id] = decision as BoardDecisionResDtoOutput
        }
      })
      setBaseDecisions(decisionsList as BoardDecisionResDtoOutput[])
      setDecisionDetailsMap((prev) => ({ ...prev, ...detailsMap }))
    }
  }, [sessionId])

  const decisions = useMemo(() => {
    return baseDecisions.map((decision) => {
      const cached = decisionDetailsMap[decision.id]
      const base = cached ?? decision
      return updates[decision.id] ? { ...base, ...updates[decision.id] } : base
    })
  }, [baseDecisions, decisionDetailsMap, updates])
  return { phase, messages, decisions, connectionState, sendMessage, updatePhase, addDecision, loadDecisionDetail, refreshDecisions }
}
