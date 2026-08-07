import test from 'node:test'
import assert from 'node:assert/strict'

import { getEligibleSeriesForScope, isValidSurveyTransition } from './admin-reference-display.ts'

test('keeps only eligible series matching the selected magazine and cadence', () => {
  const items = [
    { id: 'weekly-1', magazine: 'Jump', publicationType: 'WEEKLY' },
    { id: 'monthly-1', magazine: 'Jump', publicationType: 'MONTHLY' },
    { id: 'other-1', magazine: 'Sunday', publicationType: 'WEEKLY' },
    { id: 'legacy-1', magazine: null, publicationType: null }
  ]

  assert.deepEqual(getEligibleSeriesForScope(items, 'Jump', 'WEEKLY'), [items[0]])
})

test('allows only the documented survey lifecycle transitions', () => {
  assert.equal(isValidSurveyTransition('DRAFT', 'OPEN'), true)
  assert.equal(isValidSurveyTransition('OPEN', 'CLOSED'), true)
  assert.equal(isValidSurveyTransition('CLOSED', 'OPEN'), false)
  assert.equal(isValidSurveyTransition('REFLECTED', 'CLOSED'), false)
})
