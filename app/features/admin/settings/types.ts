import type { AppConfigResDtoOutput } from '~/api/model/app-config'
import type { BoardConfigResDtoOutput } from '~/api/model/board'
import type { VotingConfigResDtoOutput } from '~/api/model/survey'

export type AdminSettingsData = {
  appConfig: AppConfigResDtoOutput
  boardConfig: BoardConfigResDtoOutput
  votingConfig: VotingConfigResDtoOutput
  currentUserId: string
}

export type AdminSettingsActionResult = {
  ok: boolean
  intent: string
  messageKey?: string
  errorKey?: string
}
