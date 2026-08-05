import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveSelectedPaymentSeriesId } from './payment-series-filter.ts'

test('uses a requested series only when it belongs to the Mangaka series list', () => {
  assert.equal(resolveSelectedPaymentSeriesId('series-b', ['series-a', 'series-b']), 'series-b')
})

test('falls back to all personal payments for an unknown or legacy filter value', () => {
  assert.equal(resolveSelectedPaymentSeriesId('contract:contract-a', ['series-a']), undefined)
  assert.equal(resolveSelectedPaymentSeriesId('series-b', ['series-a']), undefined)
})
