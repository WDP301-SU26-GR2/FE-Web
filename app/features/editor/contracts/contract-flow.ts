import {
  CreateContractBodyDtoContractType,
  ContractResDtoOutputStatus,
  type ContractResDtoOutput,
  type ContractResDtoOutputContractType
} from '~/api/model/contracts'
import { extractApiErrorCode } from '~/shared/lib/api/extract-api-error'

export const EDITOR_CONTRACT_INTENTS = {
  create: 'createContract',
  update: 'updateContract',
  submitReview: 'submitContractReview',
  saveAndSubmitReview: 'saveAndSubmitContractReview',
  redraft: 'redraftContract'
} as const

export const CONTRACT_FIELD_LIMITS = {
  versionNoteMaxLength: 500,
  moneyMinimum: 1,
  moneyMaximum: 1_000_000_000_000,
  percentageMinimum: 0,
  percentageMaximum: 100,
  chapterMaximum: 10_000,
  rankingMaximum: 1_000
} as const

const EDITABLE_STATUSES = new Set<ContractResDtoOutput['status']>([
  ContractResDtoOutputStatus.DRAFT,
  ContractResDtoOutputStatus.BOARD_REVIEW
])

const CREATION_BLOCKING_STATUSES = new Set<ContractResDtoOutput['status']>([
  ContractResDtoOutputStatus.DRAFT,
  ContractResDtoOutputStatus.BOARD_REVIEW,
  ContractResDtoOutputStatus.AWAITING_MANGAKA,
  ContractResDtoOutputStatus.ACTIVATION_PENDING,
  ContractResDtoOutputStatus.FULLY_EXECUTED,
  ContractResDtoOutputStatus.REJECTED_BY_MANGAKA
])

const ERROR_KEY_BY_CODE = {
  'Error.ContractNotFound': 'contractNotFound',
  'Error.ContractAccessDenied': 'contractAccessDenied',
  'Error.NotAssignedContractEditor': 'notAssignedContractEditor',
  'Error.SeriesNotSerialized': 'seriesNotSerialized',
  'Error.BoardDecisionNotFound': 'boardDecisionNotFound',
  'Error.InvalidSerializationDecision': 'invalidSerializationDecision',
  'Error.ContractMangakaMismatch': 'contractMangakaMismatch',
  'Error.OpenContractExists': 'openContractExists',
  'Error.InvalidContractMoney': 'invalidContractMoney',
  'Error.InvalidContractTransition': 'invalidContractTransition',
  'Error.ContractRedraftNotAllowed': 'contractRedraftNotAllowed',
  'Error.ContractNotExecutedForPdf': 'contractNotExecutedForPdf'
} as const satisfies Record<string, string>

export function canEditContract(contract: Pick<ContractResDtoOutput, 'status'>): boolean {
  return EDITABLE_STATUSES.has(contract.status)
}

export function canSubmitContractForReview(contract: Pick<ContractResDtoOutput, 'status'>): boolean {
  return contract.status === ContractResDtoOutputStatus.DRAFT
}

export function canRedraftContract(contract: Pick<ContractResDtoOutput, 'status'>): boolean {
  return contract.status === ContractResDtoOutputStatus.REJECTED_BY_MANGAKA
}

export function blocksNewContractCreation(contract: Pick<ContractResDtoOutput, 'status'>): boolean {
  return CREATION_BLOCKING_STATUSES.has(contract.status)
}

export function ownershipIsValid(
  contractType: ContractResDtoOutputContractType,
  publisher: number,
  mangaka: number
): boolean {
  if (!Number.isInteger(publisher) || !Number.isInteger(mangaka) || publisher + mangaka !== 100) return false
  if (contractType === 'FULL_BUYOUT') return publisher === 100 && mangaka === 0
  return publisher > 0 && publisher < 100 && mangaka > 0 && mangaka < 100
}

export function contractDatesAreValid(start: string, end: string): boolean {
  const startTimestamp = Date.parse(start)
  const endTimestamp = Date.parse(end)
  return Number.isFinite(startTimestamp) && Number.isFinite(endTimestamp) && endTimestamp > startTimestamp
}

export function contractValuationIsValid(value: number): boolean {
  return (
    Number.isSafeInteger(value) &&
    value >= CONTRACT_FIELD_LIMITS.moneyMinimum &&
    value <= CONTRACT_FIELD_LIMITS.moneyMaximum
  )
}

export function isContractType(value: string): value is ContractResDtoOutputContractType {
  return Object.values(CreateContractBodyDtoContractType).some((contractType) => contractType === value)
}

export function mapEditorContractError(error: unknown): string {
  const code = extractApiErrorCode(error)
  return code ? (ERROR_KEY_BY_CODE[code as keyof typeof ERROR_KEY_BY_CODE] ?? 'actionFailed') : 'actionFailed'
}
