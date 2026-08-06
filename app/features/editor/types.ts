import type { ChapterListResDtoOutputItemsItem, ChapterResDtoOutput } from '~/api/model/chapters'
import type { ChapterProgressResDtoOutput } from '~/api/model/chapters'
import type {
  BoardDecisionResDtoOutput,
  BoardSessionResDtoOutput,
  SuggestBoardMembersResDtoOutputItemsItem
} from '~/api/model/board'
import type { ContractCommentListResDtoOutputDataItem } from '~/api/model/contracts'
import type {
  ContractResDtoOutput,
  ContractStatusProgressResDtoOutput,
  ContractVersionResDtoOutput,
  AmendmentResDtoOutput,
  PaymentConditionListResDtoOutputDataItem
} from '~/api/model/contracts'
import type { StoryboardResDtoOutput } from '~/api/model/storyboards'
import type { StageListResDtoOutput, StagePageListResDtoOutputItemsItem } from '~/api/model/production-stages'
import type { RegionListResDtoOutputItemsItem } from '~/api/model/task'
import type { SeriesListResDtoOutputItemsItem, SeriesResDtoOutput } from '~/api/model/series'

export type EditorActionResult = {
  ok: boolean
  intent: string
  messageKey?: string
  errorKey?: string
  message?: string
  phase?: 'PRESENTING' | 'QA' | 'VOTING'
  transferContractId?: string
  contractId?: string
  decision?: BoardDecisionResDtoOutput
  downloadUrl?: string
  suggestedMembers?: SuggestBoardMembersResDtoOutputItemsItem[]
  suggestedSize?: number
}

export type EditorProposalDetailData = {
  series: SeriesResDtoOutput
  coverUrl: string | null
  characterDesigns: Array<{ key: string; url: string | null }>
  storyboardPages: Array<{ pageNumber: number; key: string; url: string | null }>
}

export type EditorChapterItem = {
  series: SeriesListResDtoOutputItemsItem
  chapter: ChapterListResDtoOutputItemsItem
}

export type EditorPublicationData = {
  series: SeriesListResDtoOutputItemsItem[]
  chapters: EditorChapterItem[]
}

export type SignedPage = {
  id: string
  pageNumber: number
  status: string
  url: string | null
}

export type EditorChapterReviewData = {
  series: SeriesResDtoOutput
  chapter: ChapterResDtoOutput
  contract: ContractResDtoOutput | null
  pages: SignedPage[]
  storyboard: StoryboardResDtoOutput | null
  storyboardPages: Array<{ pageNumber: number; url: string | null }>
  progress: ChapterProgressResDtoOutput | null
  stages: StageListResDtoOutput | null
  stagePages: StagePageListResDtoOutputItemsItem[]
  regionsByPage: Record<string, RegionListResDtoOutputItemsItem[]>
}

export type EditorContractsData = {
  contracts: ContractResDtoOutput[]
  series: SeriesListResDtoOutputItemsItem[]
  decisions: BoardDecisionResDtoOutput[]
  sessions: BoardSessionResDtoOutput[]
}

export type EditorContractDetailData = {
  contract: ContractResDtoOutput
  progress: ContractStatusProgressResDtoOutput | null
  conditions: PaymentConditionListResDtoOutputDataItem[]
  versions: ContractVersionResDtoOutput[]
  amendments: AmendmentResDtoOutput[]
  comments: ContractCommentListResDtoOutputDataItem[]
}
