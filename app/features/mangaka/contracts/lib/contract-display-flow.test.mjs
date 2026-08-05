import assert from 'node:assert/strict'
import test from 'node:test'

import { getContractDisplayFlow, isAmendmentHistoryAvailable } from './contract-display-flow.ts'

test('gives the Mangaka accept and reject actions only in phase 2', () => {
  assert.deepEqual(getContractDisplayFlow('AWAITING_MANGAKA'), {
    phase: 'MANGAKA_REVIEW',
    canRespond: true,
    showSigningStatus: true
  })
  assert.deepEqual(getContractDisplayFlow('BOARD_REVIEW'), {
    phase: 'BOARD_REVIEW',
    canRespond: false,
    showSigningStatus: true
  })
})

test('keeps amendment history unavailable until the contract has been executed', () => {
  assert.equal(isAmendmentHistoryAvailable('AWAITING_MANGAKA'), false)
  assert.equal(isAmendmentHistoryAvailable('FULLY_EXECUTED'), true)
  assert.equal(isAmendmentHistoryAvailable('TERMINATED'), true)
})
