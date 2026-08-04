export function canRespondToContract(input: { status: string | null | undefined }): boolean {
  return input.status === 'AWAITING_MANGAKA'
}

export function canRespondToAmendment(input: {
  contractType: string | null | undefined
  amendmentStatus: string | null | undefined
}): boolean {
  return input.contractType === 'REVENUE_SHARE' && input.amendmentStatus === 'PENDING_SIGNATURES'
}
