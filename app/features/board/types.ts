export type BoardActionResult = {
  ok: boolean
  intent: string
  messageKey?: string
  message?: string
  requestId?: string
  downloadUrl?: string
  expiresAt?: string
}
