// Editor role — sub-features are organised by business function.
export { EditorDashboardPage } from './dashboard/editor-dashboard-page'

export { EditorProposalsPage } from './proposals/editor-proposals-page'
export { EditorProposalDetailPage } from './proposals/editor-proposal-detail-page'
export {
  EDITOR_PROPOSAL_INTENTS,
  EDITOR_PROPOSAL_ROUTES,
  EDITOR_PROPOSALS_PAGE_SIZE,
  canEditSeriesMetadata,
  canRejectProposal,
  canReleaseSeries,
  canReopenReview,
  canReviewProposal,
  isAssignedEditor,
  isEditorProposalIntent,
  isReadyToPitch,
  mapEditorProposalError
} from './proposals/proposal-review'

export { EditorPublicationPage } from './publication/editor-publication-page'
export { EditorChapterReviewPage } from './publication/editor-chapter-review-page'

export { EditorBoardPage } from './board/editor-board-page'
export { EditorBoardSessionsPage } from './board/editor-board-sessions-page'
export { EditorBoardMeetingRoomPage } from './board/editor-board-meeting-room-page'
export { EditorBoardDecisionsPage } from './board/editor-board-decisions-page'
export {
  BOARD_ROSTER_LIMITS,
  BOARD_ROSTER_MODES,
  BOARD_SESSION_FIELD_LIMITS,
  BOARD_SESSION_INTENTS,
  getBoardMaximumMemberCount,
  isValidBoardSessionTimeRange,
  isValidManualBoardRoster,
  mapBoardSessionError,
  normalizeBoardRosterSize,
  parseManualBoardMemberIds
} from './board/board-session-flow'

export { EditorContractsPage } from './contracts/editor-contracts-page'
export { EditorContractDetailPage } from './contracts/editor-contract-detail-page'
export { EditorContractTermsPage } from './contracts/editor-contract-terms-page'
export { EditorContractConditionsPage } from './contracts/editor-contract-conditions-page'
export { EditorContractHistoryPage } from './contracts/editor-contract-history-page'
export { EditorContractRevenuePage } from './contracts/editor-contract-revenue-page'
export { EditorContractPaymentsPage } from './contracts/editor-contract-payments-page'
export { EditorContractAmendmentsPage } from './contracts/editor-contract-amendments-page'
export {
  CONTRACT_FIELD_LIMITS,
  EDITOR_CONTRACT_INTENTS,
  canEditContract,
  blocksNewContractCreation,
  canRedraftContract,
  canSubmitContractForReview,
  contractDatesAreValid,
  contractValuationIsValid,
  isContractType,
  mapEditorContractError,
  ownershipIsValid as contractOwnershipIsValid
} from './contracts/contract-flow'

export { EditorOperationsPage } from './operations/editor-operations-page'
export { EditorLifecyclePage } from './operations/editor-lifecycle-page'
export { EditorSalesPage } from './operations/editor-sales-page'
export { EditorMangakaReviewsPage } from './operations/editor-mangaka-reviews-page'
export { EditorDeadlinesPage } from './operations/editor-deadlines-page'
export { EditorSurveysPage } from './operations/editor-surveys-page'
export { EditorReprintsPage } from './operations/editor-reprints-page'
export { EditorTransfersPage } from './operations/editor-transfers-page'
export { EditorPublicationVersionsPage } from './operations/editor-publication-versions-page'
export { EditorInsightsPage } from './operations/editor-insights-page'

export { EditorNotificationsPage } from './notifications/editor-notifications-page'
export { EditorProfilePage } from './profile/editor-profile-page'

export type {
  EditorActionResult,
  EditorChapterItem,
  EditorChapterReviewData,
  EditorContractDetailData,
  EditorContractsData,
  EditorProposalDetailData,
  EditorPublicationData,
  SignedPage
} from './types'
export type { EditorProposalIntent } from './proposals/proposal-review'
