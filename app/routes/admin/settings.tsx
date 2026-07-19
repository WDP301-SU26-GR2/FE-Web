import { appConfigControllerGet, appConfigControllerUpdate } from '~/api/operations/app-config/app-config'
import { boardControllerGetConfig, boardControllerUpdateConfig } from '~/api/operations/board/board'
import { surveyControllerGetVotingConfig, surveyControllerUpdateVotingConfig } from '~/api/operations/survey/survey'
import { usersControllerGetMe } from '~/api/operations/users/users'
import type { VotingConfigBodyDtoAuthMode } from '~/api/model/survey'
import { AdminSettingsPage, type AdminSettingsActionResult, type AdminSettingsData } from '~/features/admin'
import { extractApiErrorCode } from '~/shared/lib/api/extract-api-error'

import type { Route } from './+types/settings'

export function meta() {
  return [{ title: 'System Configuration - MangaStudio Pro' }]
}

export async function clientLoader() {
  try {
    const [appResponse, boardResponse, votingResponse, meResponse] = await Promise.all([
      appConfigControllerGet(),
      boardControllerGetConfig(),
      surveyControllerGetVotingConfig(),
      usersControllerGetMe()
    ])
    if (meResponse.status !== 200) return { data: null, hasError: true }
    const data: AdminSettingsData = {
      appConfig: appResponse.data,
      boardConfig: boardResponse.data,
      votingConfig: votingResponse.data,
      currentUserId: meResponse.data.id
    }
    return { data, hasError: false }
  } catch {
    return { data: null, hasError: true }
  }
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<AdminSettingsActionResult> {
  const formData = await request.formData()
  const intent = String(formData.get('intent') ?? '')

  try {
    if (intent === 'appConfig') {
      const response = await appConfigControllerUpdate({
        coOwnerApprovalGraceDays: integer(formData, 'coOwnerApprovalGraceDays'),
        nameMaxReviewRounds: integer(formData, 'nameMaxReviewRounds'),
        reputationRecommendThreshold: number(formData, 'reputationRecommendThreshold'),
        hiatusTooLongDays: integer(formData, 'hiatusTooLongDays'),
        lowVoteReliabilityThreshold: integer(formData, 'lowVoteReliabilityThreshold'),
        maxUploadBytes: integer(formData, 'maxUploadMb') * 1024 * 1024,
        assignmentGraceDays: integer(formData, 'assignmentGraceDays')
      })
      if (response.status !== 200) return failure(intent, 'validation')
      return success(intent, 'appUpdated')
    }

    if (intent === 'boardConfig') {
      const response = await boardControllerUpdateConfig(
        { id: required(formData, 'configId') },
        {
          boardTotalMembers: integer(formData, 'boardTotalMembers'),
          quorumMin: integer(formData, 'quorumMin'),
          approveMajorityRatio: number(formData, 'approveMajorityPercent') / 100,
          updatedBy: required(formData, 'updatedBy')
        }
      )
      if (response.status !== 200) return failure(intent, response.status === 404 ? 'notFound' : 'boardLocked')
      return success(intent, 'boardUpdated')
    }

    if (intent === 'votingConfig') {
      const authMode = required(formData, 'authMode') as VotingConfigBodyDtoAuthMode
      const response = await surveyControllerUpdateVotingConfig({
        authMode,
        maxSeriesPerVote: integer(formData, 'maxSeriesPerVote'),
        otpExpirySeconds: integer(formData, 'otpExpirySeconds'),
        otpMaxAttempts: integer(formData, 'otpMaxAttempts'),
        ipRateLimit: integer(formData, 'ipRateLimit'),
        phoneRateLimit: integer(formData, 'phoneRateLimit'),
        otpCooldownSeconds: integer(formData, 'otpCooldownSeconds'),
        ipVotesPerPeriod: integer(formData, 'ipVotesPerPeriod'),
        captchaThreshold: number(formData, 'captchaThreshold')
      })
      if (response.status !== 200) return failure(intent, 'notFound')
      return success(intent, 'votingUpdated')
    }

    return failure(intent, 'invalidAction')
  } catch (error) {
    return failure(intent, mapError(error))
  }
}

export default function AdminSettingsRoute({ loaderData }: Route.ComponentProps) {
  return <AdminSettingsPage data={loaderData.data} hasError={loaderData.hasError} />
}

function required(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? '').trim()
  if (!value) throw new Error(`Missing ${key}`)
  return value
}

function number(formData: FormData, key: string) {
  const value = Number(required(formData, key))
  if (!Number.isFinite(value)) throw new Error(`Invalid ${key}`)
  return value
}

function integer(formData: FormData, key: string) {
  const value = number(formData, key)
  if (!Number.isInteger(value)) throw new Error(`Invalid ${key}`)
  return value
}

function success(intent: string, messageKey: string): AdminSettingsActionResult {
  return { ok: true, intent, messageKey }
}

function failure(intent: string, errorKey: string): AdminSettingsActionResult {
  return { ok: false, intent, errorKey }
}

function mapError(error: unknown) {
  const code = extractApiErrorCode(error)
  if (code === 'Error.BoardConfigLocked') return 'boardLocked'
  if (code === 'Error.BoardConfigNotFound' || code === 'Error.VotingConfigNotFound') return 'notFound'
  return 'actionFailed'
}
