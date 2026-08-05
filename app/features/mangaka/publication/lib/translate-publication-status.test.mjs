import assert from 'node:assert/strict'
import test from 'node:test'

import {
  translatePageStatus,
  translateProductionStageName,
  translateStoryboardStatus
} from './translate-publication-status.ts'

const translate = (key) => key

test('translates documented StoryboardStatus values to publication locale keys', () => {
  assert.equal(translateStoryboardStatus('APPROVED', translate), 'publication.storyboardStatus.APPROVED')
})

test('translates documented PageStatus values to publication locale keys', () => {
  assert.equal(translatePageStatus('REVISING', translate), 'publication.pageStatus.REVISING')
})

test('does not expose an unknown API status as UI text', () => {
  assert.equal(translatePageStatus('FUTURE_STATUS', translate), 'state.unknown')
})

test('translates the documented production stage names and preserves custom names', () => {
  assert.equal(
    translateProductionStageName('FINAL_CHECK', translate),
    'seriesDetail.production.productionStage.FINAL_CHECK'
  )
  assert.equal(translateProductionStageName('My custom stage', translate), 'My custom stage')
})
