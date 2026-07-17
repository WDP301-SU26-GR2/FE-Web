import { useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'
import type { BoardDecisionResDtoOutput, BoardSessionResDtoOutput } from '~/api/model/board'
import { env } from '~/shared/config/env'
import { STORAGE_KEYS } from '~/shared/config/site'
import { readStorage } from '~/shared/lib/storage'

type VoteProgress = Pick<
  BoardDecisionResDtoOutput,
  'approveCount' | 'rejectCount' | 'totalVotes' | 'quorumMet' | 'result'
> & {
  decisionId: string
}

export type VoteProgressConnectionState = 'connecting' | 'connected' | 'disconnected'

function getBoardNamespaceUrl() {
  if (typeof window === 'undefined') return ''
  if (!env.API_URL) return `${window.location.origin}/board`

  try {
    return `${new URL(env.API_URL, window.location.origin).origin}/board`
  } catch {
    return `${window.location.origin}/board`
  }
}

export function useEditorSessionVoteProgress(
  sessions: BoardSessionResDtoOutput[],
  decisions: BoardDecisionResDtoOutput[]
) {
  const [updates, setUpdates] = useState<Record<string, VoteProgress>>({})
  const [connectionState, setConnectionState] = useState<VoteProgressConnectionState>(() =>
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

    const socket = io(namespaceUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    })

    socket.on('connect', () => {
      let joinedSessionCount = 0
      sessionIds.forEach((sessionId) => {
        socket.emit('joinSession', { sessionId }, (response: { status?: string }) => {
          if (response?.status === 'SUCCESS') {
            joinedSessionCount += 1
            setConnectionState('connected')
          } else if (joinedSessionCount === 0) {
            setConnectionState('disconnected')
          }
        })
      })
    })
    socket.on('disconnect', () => setConnectionState('disconnected'))
    socket.on('connect_error', () => setConnectionState('disconnected'))
    socket.on('voteProgressUpdated', (progress: VoteProgress) => {
      if (!progress?.decisionId) return
      setUpdates((current) => ({ ...current, [progress.decisionId]: progress }))
    })

    return () => {
      socket.disconnect()
    }
  }, [sessionIds, sessionKey])

  const liveDecisions = useMemo(
    () =>
      decisions.map((decision) => {
        const update = updates[decision.id]
        return update ? { ...decision, ...update } : decision
      }),
    [decisions, updates]
  )

  return { decisions: liveDecisions, connectionState }
}
