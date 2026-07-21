export type BoardActionResult = {
  ok: boolean
  intent: string
  messageKey?: string
  message?: string
  requestId?: string
}
