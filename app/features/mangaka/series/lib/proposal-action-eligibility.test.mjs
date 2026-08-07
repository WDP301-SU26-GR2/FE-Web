import test from 'node:test'
import assert from 'node:assert/strict'

import { getProposalActionEligibility } from './proposal-action-eligibility.ts'

test('hides proposal editing after the current revision has been acknowledged', () => {
  const eligibility = getProposalActionEligibility({
    isOwner: true,
    seriesStatus: 'IN_REVIEW',
    proposalStatus: 'PROPOSAL_REVISION',
    hasOpenRevisions: true,
    revisionAcknowledged: true
  })

  assert.equal(eligibility.canEdit, false)
})

test('keeps proposal editing available before the current revision is acknowledged', () => {
  const eligibility = getProposalActionEligibility({
    isOwner: true,
    seriesStatus: 'IN_REVIEW',
    proposalStatus: 'PROPOSAL_REVISION',
    hasOpenRevisions: true,
    revisionAcknowledged: false
  })

  assert.equal(eligibility.canEdit, true)
})
