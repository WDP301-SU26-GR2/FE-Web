import assert from 'node:assert/strict'
import test from 'node:test'

import { translateManuscriptStatus } from './translate-manuscript-status.ts'

const translate = (key) => key

test('translates a documented manuscript status to its dashboard locale key', () => {
  assert.equal(translateManuscriptStatus('IN_PRODUCTION', translate), 'dashboard.studio.subtitleInProduction')
})

test('uses the generic locale key for an unknown manuscript status', () => {
  assert.equal(translateManuscriptStatus('FUTURE_STATE', translate), 'state.unknown')
})
