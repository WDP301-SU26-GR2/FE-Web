import type { TransferRequestResDtoOutput } from '~/api/model/transfer'

export type BoardActionResult = {
  ok: boolean
  intent: string
  messageKey?: string
  message?: string
  requestId?: string
  request?: TransferRequestResDtoOutput
  downloadUrl?: string
  expiresAt?: string
}
