import type { ContractResDtoOutput } from '~/api/model/contracts'

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

export function getContractBoardRoster(contract: ContractResDtoOutput): string[] {
  return (contract as ContractWithLatestRelations).boardDecision?.boardSession.allowedEditorIds ?? []
}
