import assert from 'node:assert/strict'
import test from 'node:test'

import {
  BOARD_CONTRACT_DECISION_RESOURCE_TYPES,
  BOARD_SESSION_DECISION_TYPES,
  hasBoardDecisionConflict,
  isBoardContractDecisionResourceType,
  isBoardSessionDecisionType
} from '../app/features/editor/board/board-decision-flow.ts'

test('only exposes decision types backed by the current Board flows', () => {
  assert.deepEqual(BOARD_SESSION_DECISION_TYPES, [
    'SERIALIZATION',
    'CONTINUE',
    'CANCELLATION',
    'FORMAT_CHANGE',
    'COMPLETION',
    'CONTRACT',
    'TRANSFER'
  ])

  for (const legacyType of ['CANCEL', 'HIATUS', 'ENDING_ALLOWANCE', 'SERIES_CONTRACT_APPROVAL', 'REPRINT']) {
    assert.equal(isBoardSessionDecisionType(legacyType), false)
  }
})

test('limits CONTRACT decisions to resources that require a Board approval gate', () => {
  assert.deepEqual(BOARD_CONTRACT_DECISION_RESOURCE_TYPES, ['CONTRACT_AMENDMENT', 'TRANSFER_CONTRACT'])
  assert.equal(isBoardContractDecisionResourceType('CONTRACT_AMENDMENT'), true)
  assert.equal(isBoardContractDecisionResourceType('TRANSFER_CONTRACT'), true)
  assert.equal(isBoardContractDecisionResourceType('PUBLICATION_CONTRACT'), false)
  assert.equal(isBoardContractDecisionResourceType('REPLACEMENT_CONTRACT'), false)
})

test('treats completion and cancellation as competing ending decisions', () => {
  const decisions = [{ targetSeriesId: 'series-1', decisionType: 'COMPLETION' }]

  assert.equal(hasBoardDecisionConflict(decisions, { seriesId: 'series-1', decisionType: 'CANCELLATION' }), true)
  assert.equal(hasBoardDecisionConflict(decisions, { seriesId: 'series-1', decisionType: 'CONTINUE' }), false)
})

test('allows separate contract resources but blocks an exact duplicate', () => {
  const decisions = [
    {
      targetSeriesId: 'series-1',
      decisionType: 'CONTRACT',
      details: { resourceId: 'amendment-1', versionId: '' }
    }
  ]

  assert.equal(
    hasBoardDecisionConflict(decisions, {
      seriesId: 'series-1',
      decisionType: 'CONTRACT',
      resourceId: 'amendment-1',
      versionId: ''
    }),
    true
  )
  assert.equal(
    hasBoardDecisionConflict(decisions, {
      seriesId: 'series-1',
      decisionType: 'CONTRACT',
      resourceId: 'amendment-2',
      versionId: ''
    }),
    false
  )
})

test('blocks only the same transfer request', () => {
  const decisions = [
    {
      targetSeriesId: 'series-1',
      decisionType: 'TRANSFER',
      details: { transferRequestId: 'transfer-1' }
    }
  ]

  assert.equal(
    hasBoardDecisionConflict(decisions, {
      seriesId: 'series-1',
      decisionType: 'TRANSFER',
      transferRequestId: 'transfer-1'
    }),
    true
  )
  assert.equal(
    hasBoardDecisionConflict(decisions, {
      seriesId: 'series-1',
      decisionType: 'TRANSFER',
      transferRequestId: 'transfer-2'
    }),
    false
  )
})
