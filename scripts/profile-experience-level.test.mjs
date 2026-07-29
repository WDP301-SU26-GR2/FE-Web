import assert from 'node:assert/strict'
import test from 'node:test'

import { EXPERIENCE_LEVELS, normalizeExperienceLevel } from '../app/features/profile/lib/experience-level.ts'

test('exposes exactly the three permitted experience levels', () => {
  assert.deepEqual(EXPERIENCE_LEVELS, ['JUNIOR', 'MID', 'SENIOR'])
})

test('normalizes legacy profile values to an empty selection', () => {
  assert.equal(normalizeExperienceLevel('JUNIOR'), 'JUNIOR')
  assert.equal(normalizeExperienceLevel('5 years'), '')
  assert.equal(normalizeExperienceLevel(null), '')
})
