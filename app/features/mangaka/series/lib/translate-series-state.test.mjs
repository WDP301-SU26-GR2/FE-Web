import assert from 'node:assert/strict'
import test from 'node:test'

import { translateNameStatus, translateProposalStatus, translateSeriesStatus } from './translate-series-state.ts'

const translate = (key) => key

test('translates a documented series status to its list locale key', () => {
  assert.equal(translateSeriesStatus('IN_REVIEW', translate), 'mySeries.statuses.IN_REVIEW')
})

test('translates a documented proposal status to its detail locale key', () => {
  assert.equal(translateProposalStatus('PROPOSAL_REVISION', translate), 'seriesDetail.proposalStatus.PROPOSAL_REVISION')
})

test('translates a documented Name status to its detail locale key', () => {
  assert.equal(translateNameStatus('IN_REVIEW', translate), 'seriesDetail.nameStatus.IN_REVIEW')
})

test('uses the generic locale key for a missing Name status', () => {
  assert.equal(translateNameStatus(null, translate), 'state.unknown')
})
