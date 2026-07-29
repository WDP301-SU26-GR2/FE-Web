import assert from 'node:assert/strict'
import test from 'node:test'

import { loadPublicSeriesCatalog } from '../app/features/mangaka/transfers/load-public-series-catalog.ts'

test('loads the complete transfer catalog without exceeding the public-series limit', async () => {
  const catalog = Array.from({ length: 101 }, (_, index) => ({ id: `series-${index + 1}` }))
  const calls = []

  const result = await loadPublicSeriesCatalog(async ({ limit, offset }) => {
    calls.push({ limit, offset })
    return {
      status: 200,
      data: {
        items: catalog.slice(offset, offset + limit),
        total: catalog.length,
        limit,
        offset
      }
    }
  })

  assert.deepEqual(result, catalog)
  assert.deepEqual(calls, [
    { limit: 50, offset: 0 },
    { limit: 50, offset: 50 },
    { limit: 50, offset: 100 }
  ])
})
