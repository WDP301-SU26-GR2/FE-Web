import assert from 'node:assert/strict'
import test from 'node:test'

import { getAmendmentReason, getContractVersionDisplay } from './contract-version-display.ts'

const translate = (key) => key

test('exposes only user-facing contract version fields, never audit IDs', () => {
  assert.deepEqual(
    getContractVersionDisplay({
      id: 'version-id',
      contractId: 'contract-id',
      versionNumber: 2,
      editedById: 'editor-id',
      createdAt: '2026-08-04T15:44:55.000Z'
    }),
    { versionNumber: 2, createdAt: '2026-08-04T15:44:55.000Z' }
  )
})

test('keeps an editor-written amendment reason from the API unchanged', () => {
  assert.equal(
    getAmendmentReason('COMPLETION', 'Early completion — review contract terms', translate),
    'Early completion — review contract terms'
  )
})

test('uses the localized fallback only when the API does not provide a reason', () => {
  assert.equal(getAmendmentReason('MANUAL', null, translate), 'contracts.detail.amendmentFallback')
})
