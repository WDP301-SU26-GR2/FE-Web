import { SeriesResDtoOutputProposalStatus, SeriesResDtoOutputStatus, type SeriesResDtoOutput } from '~/api/model/series'
import { extractApiErrorCode } from '~/shared/lib/api/extract-api-error'

export const EDITOR_PROPOSAL_INTENTS = {
  claim: 'claimSeries',
  approve: 'approveProposal',
  requestRevision: 'reviseProposal',
  reject: 'rejectSeries',
  reopen: 'reopenReview',
  release: 'releaseSeries',
  pitch: 'pitchSeries'
} as const

export const EDITOR_PROPOSAL_ROUTES = {
  list: '/dashboard/editor/proposals',
  boardSessions: '/dashboard/editor/board/sessions',
  detail: (seriesId: string) => `/dashboard/editor/proposals/${seriesId}`,
  listPage: (offset: number) => `/dashboard/editor/proposals?offset=${offset}`
} as const

export const EDITOR_PROPOSALS_PAGE_SIZE = 20

const ERROR_KEY_BY_CODE = {
  'Error.SeriesAlreadyClaimed': 'alreadyClaimed',
  'Error.ReviewAlreadyStarted': 'reviewStarted',
  'Error.NotAssignedEditor': 'notAssigned',
  'Error.InvalidProposalState': 'invalidState',
  'Error.InvalidSeriesTransition': 'invalidState',
  'Error.SeriesNotReadyToPitch': 'notReadyToPitch',
  'Error.SeriesNotEditable': 'metadataLocked',
  'Error.SeriesMetadataConflict': 'metadataConflict',
  'Error.SeriesAccessDenied': 'accessDenied'
} as const satisfies Record<string, string>

export type EditorProposalIntent = (typeof EDITOR_PROPOSAL_INTENTS)[keyof typeof EDITOR_PROPOSAL_INTENTS]

export function isEditorProposalIntent(value: string): value is EditorProposalIntent {
  return Object.values(EDITOR_PROPOSAL_INTENTS).some((intent) => intent === value)
}

export function isAssignedEditor(series: SeriesResDtoOutput, userId?: string): boolean {
  return Boolean(userId && series.editorId === userId)
}

export function canReviewProposal(series: SeriesResDtoOutput, userId?: string): boolean {
  return (
    isAssignedEditor(series, userId) &&
    series.status === SeriesResDtoOutputStatus.IN_REVIEW &&
    series.proposal?.status === SeriesResDtoOutputProposalStatus.PROPOSAL_REVIEW
  )
}

export function canReleaseSeries(series: SeriesResDtoOutput, userId?: string): boolean {
  return (
    isAssignedEditor(series, userId) && series.status === SeriesResDtoOutputStatus.IN_REVIEW && !series.reviewStartedAt
  )
}

export function canRejectProposal(series: SeriesResDtoOutput, userId?: string): boolean {
  return canReviewProposal(series, userId)
}

export function canReopenReview(series: SeriesResDtoOutput, userId?: string): boolean {
  return isAssignedEditor(series, userId) && series.status === SeriesResDtoOutputStatus.REJECTED
}

export function isReadyToPitch(series: SeriesResDtoOutput, userId?: string): boolean {
  return isAssignedEditor(series, userId) && series.status === SeriesResDtoOutputStatus.READY_TO_PITCH
}

export function mapEditorProposalError(error: unknown): string {
  const code = extractApiErrorCode(error)
  return code ? (ERROR_KEY_BY_CODE[code as keyof typeof ERROR_KEY_BY_CODE] ?? 'actionFailed') : 'actionFailed'
}
