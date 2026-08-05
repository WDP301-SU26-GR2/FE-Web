import { extractApiErrorCode } from '~/shared/lib/api/extract-api-error'

export const BOARD_SESSION_INTENTS = {
  create: 'createSession',
  start: 'startSession',
  conclude: 'concludeSession'
} as const

export const BOARD_SESSION_FIELD_LIMITS = {
  titleMinLength: 5,
  titleMaxLength: 100,
  descriptionMaxLength: 500
} as const

export const BOARD_DECISION_LIMITS = {
  startIssueMaximum: 1_000_000
} as const

const ERROR_KEY_BY_CODE = {
  'Error.BoardSessionAlreadyExists': 'sessionAlreadyExists',
  'Error.InvalidBoardMembers': 'invalidBoardMembers',
  'Error.RosterSourceRequired': 'rosterSourceRequired',
  'Error.NotEnoughBoardMembers': 'notEnoughBoardMembers',
  'Error.RosterSizeTooLarge': 'rosterSizeTooLarge',
  'Error.SeriesNotFound': 'seriesNotFound',
  'Error.BoardSessionNotFound': 'sessionNotFound',
  'Error.BoardSessionNotOpen': 'sessionNotOpen',
  'Error.InvalidBoardSessionTransition': 'invalidSessionTransition',
  'Error.NotSessionCreator': 'notSessionCreator'
} as const satisfies Record<string, string>

export function isValidBoardSessionTimeRange(startTime: string, endTime?: string): boolean {
  const startTimestamp = Date.parse(startTime)
  if (!Number.isFinite(startTimestamp) || startTimestamp <= Date.now()) return false
  if (!endTime) return true
  const endTimestamp = Date.parse(endTime)
  return Number.isFinite(endTimestamp) && endTimestamp > startTimestamp
}

export function mapBoardSessionError(error: unknown): string {
  const code = extractApiErrorCode(error)
  return code ? (ERROR_KEY_BY_CODE[code as keyof typeof ERROR_KEY_BY_CODE] ?? 'actionFailed') : 'actionFailed'
}
