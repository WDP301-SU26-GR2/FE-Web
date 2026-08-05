import assert from 'node:assert/strict'
import test from 'node:test'

import { getPaymentExplanationKey } from './payment-explanation.ts'

test('describes a triggered payment as awaiting approval and settlement', () => {
  assert.equal(getPaymentExplanationKey('status', 'TRIGGERED'), 'finance.statusDescription.TRIGGERED')
})

test('describes a chapter milestone payment by its contract condition', () => {
  assert.equal(getPaymentExplanationKey('type', 'CHAPTER_MILESTONE'), 'finance.typeDescription.CHAPTER_MILESTONE')
})

test('uses the generic explanation for an unknown payment category', () => {
  assert.equal(getPaymentExplanationKey('status', 'UNKNOWN'), 'finance.explanationUnavailable')
})
