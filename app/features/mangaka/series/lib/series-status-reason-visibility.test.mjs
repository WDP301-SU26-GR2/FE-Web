import test from 'node:test'
import assert from 'node:assert/strict'

import { shouldShowSeriesStatusReason } from './series-status-reason-visibility.ts'

test('shows the editor rejection reason for an abandoned series', () => {
  assert.equal(shouldShowSeriesStatusReason('ABANDONED', 'Needs a new premise'), true)
})

test('hides the status reason for every status except abandoned', () => {
  assert.equal(shouldShowSeriesStatusReason('REJECTED', 'Legacy rejection reason'), false)
  assert.equal(shouldShowSeriesStatusReason('DRAFT', 'Draft note'), false)
})

test('hides the status reason when an abandoned series has no reason', () => {
  assert.equal(shouldShowSeriesStatusReason('ABANDONED', null), false)
  assert.equal(shouldShowSeriesStatusReason('ABANDONED', ''), false)
})
