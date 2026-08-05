import assert from 'node:assert/strict'
import test from 'node:test'

import { canEditSeriesMetadata, getProposalActionEligibility } from './proposal-action-eligibility.ts'

test('keeps resubmission hidden while revision requests are still open', () => {
  assert.equal(
    getProposalActionEligibility({
      isOwner: true,
      seriesStatus: 'DRAFT',
      proposalStatus: 'PROPOSAL_REVISION',
      hasOpenRevisions: true
    }).canResubmit,
    false
  )
})

test('allows resubmission only after all revision requests are addressed', () => {
  assert.equal(
    getProposalActionEligibility({
      isOwner: true,
      seriesStatus: 'DRAFT',
      proposalStatus: 'PROPOSAL_REVISION',
      hasOpenRevisions: false
    }).canResubmit,
    true
  )
})

test('hides metadata editing while the editable proposal action is available', () => {
  assert.equal(
    canEditSeriesMetadata({
      isOwner: true,
      seriesStatus: 'DRAFT',
      canEditProposal: true
    }),
    false
  )
})

test('shows metadata editing after the proposal is no longer editable', () => {
  assert.equal(
    canEditSeriesMetadata({
      isOwner: true,
      seriesStatus: 'IN_REVIEW',
      canEditProposal: false
    }),
    true
  )
})

test('hides metadata editing for a terminal series status', () => {
  assert.equal(
    canEditSeriesMetadata({
      isOwner: true,
      seriesStatus: 'COMPLETED',
      canEditProposal: false
    }),
    false
  )
})
