import type { ContractResDtoOutput } from '~/api/model/contracts'
import { customFetch } from '~/api/mutator/custom-fetch'

export type ContractPdfResponse = {
  downloadUrl: string
  expiresAt: string
  key: string
}

export type ContractBoardDecisionRelation = {
  id: string
  decisionType: string | null
  result: string | null
  decidedAt: string | null
  boardSession: {
    id: string
    title: string
    startTime: string
    allowedEditorIds: string[]
  }
}

export type ContractWithLatestRelations = ContractResDtoOutput & {
  boardDecision?: ContractBoardDecisionRelation | null
}

export function getContractPdf(id: string) {
  return customFetch<{ data: ContractPdfResponse; status: number }>(`/contracts/${encodeURIComponent(id)}/pdf`, {
    method: 'GET'
  })
}

export function getContractBoardRoster(contract: ContractResDtoOutput): string[] {
  return (contract as ContractWithLatestRelations).boardDecision?.boardSession.allowedEditorIds ?? []
}
