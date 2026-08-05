// Mangaka role — sub-features are organised by business function.
// Each sub-module re-exports its public surface via its own barrel.
export { MangakaDashboard } from './dashboard/mangaka-dashboard'

// Series (proposals & series lifecycle)
export { MySeriesPage } from './series/my-series-page'
export { MySeriesDetailPage } from './series/my-series-detail-page'
export { EditProposalPage } from './series/edit-proposal-page'
export { CreateProposalWizard } from './series/components/create-proposal-wizard'
export { FranchiseConsentPage, type FranchiseConsentActionResult } from './series/franchise-consent-page'

// Chapters (publication)
export { CreateChapterDialog } from './chapters/create-chapter-dialog'
export { PublicationSection } from './chapters/publication-section'
export { ChapterNotificationPage } from './publication/chapter-notification-page'
export { MangakaTaskDetailPage } from './assistants/mangaka-task-detail-page'
export { mangakaRouteMeta } from './mangaka-route-meta'

// Publication workbench — split into Name and Pages routes under
// `/publish/:seriesId/:chapterId/{name,pages}`. The shell layout component
// owns the chapter/name/pages fetch lifecycle and is mounted by the route's
// `_layout.tsx`. Route entry files import the view components directly; the
// pages-level barrel only needs to expose the shell when other features
// need to read publication context from outside (none currently do, so it's
// kept internal).
export { PublicationShell } from './publication/publication-shell'

// Studio (signed image gallery)
export { MyStudioPage } from './studio/my-studio-page'
export { StudioOverviewPage } from './studio/studio-overview-page'

// Assistants (directory + invite + assignments)
export { AssistantDirectoryPage } from './assistants/assistant-directory-page'
export { AssignTaskDialog, type AssignTaskDialogProps } from './assistants/components/assign-task-dialog'
export { useTaskComposerData } from './assistants/use-task-composer-data'
export { useAssignTask } from './assistants/use-assign-task'
export { getTaskStatusTone } from './assistants/lib/task-status-meta'

// Peer Mangaka directory (public profiles + Editor reviews)
export { MangakaDirectoryPage } from './peers'

// Notifications (list + mark read; deep-link theo referenceType prefix §0.6)
export { MangakaNotificationsPage, useMangakaNotifications, NOTIFICATION_PAGE_SIZE } from './notifications'

// Deadlines (Mangaka party negotiation only)
export { MangakaDeadlinesPage } from './deadlines'

// Rankings (§9: latest reflected period + history picker + my-series trend)
export { MangakaRankingsPage, useMangakaRankings, PUBLICATION_TYPE_OPTIONS } from './rankings'
export type { RankingPublicationType } from './rankings'

// Finance (read-only earnings and payment records)
export { MangakaFinancePage, MangakaPaymentDetailPage, resolveSelectedPaymentSeriesId } from './finance'

// Transfers
export { loadPublicSeriesCatalog } from './transfers/load-public-series-catalog'
export {
  isTransferEligibleSeriesStatus,
  selectEligibleTransferSeries
} from './transfers/select-eligible-transfer-series'

// Contracts (review, negotiation and signing)
export {
  MangakaContractDetailPage,
  MangakaContractsPage,
  type MangakaContractActionResult
} from './contracts/mangaka-contract-pages'
export { MangakaContractVersionDetailPage } from './contracts/mangaka-contract-version-detail-page'
