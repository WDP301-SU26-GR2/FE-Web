import type { ChapterListResDtoOutputItemsItem, ChapterResDtoOutput } from '~/api/model/chapters'
import type { ChapterProgressResDtoOutput } from '~/api/model/chapters'
import type { AnnotationListResDtoOutputItemsItem } from '~/api/model/annotations'
import type { BoardDecisionResDtoOutput, BoardSessionResDtoOutput } from '~/api/model/board'
import type {
  ContractResDtoOutput,
  ContractStatusProgressResDtoOutput,
  ContractVersionResDtoOutput,
  AmendmentResDtoOutput,
  PaymentConditionListResDtoOutputDataItem
} from '~/api/model/contracts'
import type { NameListResDtoOutputItemsItem } from '~/api/model/names'
import type { SeriesListResDtoOutputItemsItem, SeriesResDtoOutput } from '~/api/model/series'

export type EditorActionResult = {
  ok: boolean
  intent: string
  messageKey?: string
  errorKey?: string
  message?: string
  phase?: 'PRESENTING' | 'QA' | 'VOTING'
  transferContractId?: string
  decision?: BoardDecisionResDtoOutput
}

export type EditorProposalDetailData = {
  series: SeriesResDtoOutput
  name: NameListResDtoOutputItemsItem | null
  coverUrl: string | null
  characterDesignUrls: string[]
  namePageUrls: Array<{ pageNumber: number; url: string | null }>
  nameAnnotations: AnnotationListResDtoOutputItemsItem[]
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
  name: NameListResDtoOutputItemsItem | null
  namePages: Array<{ pageNumber: number; url: string | null }>
  progress: ChapterProgressResDtoOutput | null
  annotations: AnnotationListResDtoOutputItemsItem[]
  nameAnnotations: AnnotationListResDtoOutputItemsItem[]
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
}
