// Mangaka role — sub-features are organised by business function.
// Each sub-module re-exports its public surface via its own barrel.
export { MangakaDashboard } from './dashboard/mangaka-dashboard'

// Series (proposals & series lifecycle)
export { MySeriesPage } from './series/my-series-page'
export { MySeriesDetailPage } from './series/my-series-detail-page'
export { EditProposalPage } from './series/edit-proposal-page'
export { CreateProposalWizard } from './series/components/create-proposal-wizard'

// Chapters (publication)
export { CreateChapterDialog } from './chapters/create-chapter-dialog'
export { PublicationSection } from './chapters/publication-section'

// Publication workbench — focused work area for Name + Page CRUD on a chapter,
// rendered outside the dashboard sidebar (own header with theme/language toggle).
export { PublicationWorkbench, PublicationHeader } from './publication'

// Studio (signed image gallery)
export { MyStudioPage } from './studio/my-studio-page'

// Assistants (directory + invite + assignments)
export { AssistantDirectoryPage } from './assistants/assistant-directory-page'

// Contracts (review, negotiation and signing)
export {
  MangakaContractDetailPage,
  MangakaContractsPage,
  type MangakaContractActionResult
} from './contracts/mangaka-contract-pages'
