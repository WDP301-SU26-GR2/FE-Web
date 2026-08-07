import assert from 'node:assert/strict'
import test from 'node:test'

import { isPageSetLocked } from './page-set-lock.ts'

test('locks the page set when active-stage outputs are confirmed', () => {
  assert.equal(isPageSetLocked('ACTIVE', true), true)
})

test('keeps the page set open while active-stage outputs are unconfirmed', () => {
  assert.equal(isPageSetLocked('ACTIVE', false), false)
})

test('reopens the page set when the next stage becomes active', () => {
  assert.equal(isPageSetLocked('ACTIVE', false), false)
})

test('locks the page set when there is no active stage', () => {
  assert.equal(isPageSetLocked(undefined, false), true)
})
