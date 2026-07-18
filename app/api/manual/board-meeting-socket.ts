import type { Socket } from 'socket.io-client'
import type { BoardMessage } from './board-meeting'

export type BoardJoinAck = { status: 'SUCCESS' | 'DENIED' | 'ERROR'; reason?: string }
export type BoardMessageAck = BoardJoinAck & { message?: BoardMessage }

const ACK_TIMEOUT_MS = 10_000

export function joinBoardSession(socket: Socket, sessionId: string, onDenied: (ack: BoardJoinAck) => void) {
  socket.emit('joinSession', { sessionId }, (ack?: BoardJoinAck) => {
    if (ack?.status === 'DENIED' || ack?.status === 'ERROR') onDenied(ack)
  })
}

export function sendBoardMessage(socket: Socket | null, sessionId: string, content: string) {
  if (!socket?.connected) return Promise.resolve<BoardMessageAck>({ status: 'ERROR', reason: 'DISCONNECTED' })

  return new Promise<BoardMessageAck>((resolve) => {
    socket
      .timeout(ACK_TIMEOUT_MS)
      .emit('sendMessage', { sessionId, content }, (error: Error | null, ack?: BoardMessageAck) => {
        if (error || !ack) resolve({ status: 'ERROR', reason: 'TIMEOUT' })
        else resolve(ack)
      })
  })
}
