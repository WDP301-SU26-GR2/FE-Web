import assert from 'node:assert/strict'
import test from 'node:test'

import { buildMangakaDirectoryParams } from '../app/features/mangaka/peers/mangaka-directory-query.ts'

test('normalizes the directory filters and converts the UI page to an API offset', () => {
  assert.deepEqual(
    buildMangakaDirectoryParams({
      page: 3,
      pageSize: 8,
      query: '  Aki  ',
      genre: 'FANTASY',
      level: '  Senior  '
    }),
    {
      limit: 8,
      offset: 16,
      q: 'Aki',
      genre: 'FANTASY',
      level: 'Senior'
    }
  )
})

test('omits blank optional filters and clamps an invalid page to the first page', () => {
  assert.deepEqual(
    buildMangakaDirectoryParams({
      page: 0,
      pageSize: 8,
      query: '   ',
      level: ''
    }),
    {
      limit: 8,
      offset: 0
    }
  )
})
