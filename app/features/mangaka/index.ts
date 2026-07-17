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

// Assistants (directory + invite + assignments)
export { AssistantDirectoryPage } from './assistants/assistant-directory-page'
export { AssignTaskDialog, type AssignTaskDialogProps } from './assistants/components/assign-task-dialog'
export { useTaskComposerData } from './assistants/use-task-composer-data'
export { useAssignTask } from './assistants/use-assign-task'
export { getTaskStatusTone } from './assistants/lib/task-status-meta'
