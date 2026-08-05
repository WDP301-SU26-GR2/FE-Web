import type { TransferRequestResDtoOutput } from '~/api/model/transfer'

export type BoardActionResult = {
  ok: boolean
  intent: string
  messageKey?: string
  message?: string
  errorCode?: string
  requestId?: string
  request?: TransferRequestResDtoOutput
  replacementContractId?: string
  downloadUrl?: string
  expiresAt?: string
}
