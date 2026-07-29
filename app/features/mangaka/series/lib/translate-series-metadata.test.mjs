import assert from 'node:assert/strict'
import test from 'node:test'

import {
  formatGenres,
  translateDemographic,
  translateGenre,
  translatePublicationType
} from './translate-series-metadata.ts'

const translate = (key) => key

test('uses the proposal wizard key to translate a genre', () => {
  assert.equal(translateGenre('ACTION', translate), 'wizard.enums.genres.ACTION')
})

test('uses the proposal wizard key to translate a demographic', () => {
  assert.equal(translateDemographic('SHONEN', translate), 'wizard.enums.demographic.SHONEN')
})

test('uses the proposal wizard key to translate a publication type', () => {
  assert.equal(translatePublicationType('MONTHLY', translate), 'wizard.enums.publicationType.MONTHLY')
})

test('uses the generic locale key for an unknown metadata value', () => {
  assert.equal(translateGenre('FUTURE_GENRE', translate), 'state.unknown')
})

test('formats every genre in a series-list label through the proposal wizard keys', () => {
  assert.equal(
    formatGenres(['ACTION', 'ADVENTURE', 'COMEDY'], translate),
    'wizard.enums.genres.ACTION · wizard.enums.genres.ADVENTURE · wizard.enums.genres.COMEDY'
  )
})
