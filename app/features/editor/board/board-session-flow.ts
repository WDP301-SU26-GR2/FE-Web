import { extractApiErrorCode } from '~/shared/lib/api/extract-api-error'

export const BOARD_SESSION_INTENTS = {
  suggestMembers: 'suggestBoardMembers',
  create: 'createSession',
  start: 'startSession',
  conclude: 'concludeSession'
} as const

export const BOARD_ROSTER_MODES = {
  automatic: 'automatic',
  manual: 'manual'
} as const

export const BOARD_ROSTER_LIMITS = {
  minimum: 3,
  hardMaximum: 9
} as const

export const BOARD_SESSION_FIELD_LIMITS = {
  titleMinLength: 5,
  titleMaxLength: 100,
  descriptionMaxLength: 500
} as const

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/

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

export function getBoardMaximumMemberCount(boardTotalMembers: number): number {
  return Math.max(0, Math.min(Math.trunc(boardTotalMembers), BOARD_ROSTER_LIMITS.hardMaximum))
}

export function normalizeBoardRosterSize(quorumMin: number, boardTotalMembers: number): number {
  const maximum = Math.max(BOARD_ROSTER_LIMITS.minimum, getBoardMaximumMemberCount(boardTotalMembers))
  let size = Math.max(BOARD_ROSTER_LIMITS.minimum, Math.min(Math.trunc(quorumMin), maximum))
  if (size % 2 === 0) size -= 1
  return Math.max(BOARD_ROSTER_LIMITS.minimum, size)
}

export function parseManualBoardMemberIds(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[\s,;]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ]
}

export function isValidManualBoardRoster(ids: string[], maximum: number): boolean {
  return (
    ids.length >= BOARD_ROSTER_LIMITS.minimum &&
    ids.length <= maximum &&
    ids.length % 2 === 1 &&
    ids.every((id) => OBJECT_ID_PATTERN.test(id))
  )
}

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
