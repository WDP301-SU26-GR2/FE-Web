import assert from 'node:assert/strict'
import test from 'node:test'

import { loadPublicSeriesCatalog } from '../app/features/mangaka/transfers/load-public-series-catalog.ts'
import {
  isTransferEligibleSeriesStatus,
  selectEligibleTransferSeries
} from '../app/features/mangaka/transfers/select-eligible-transfer-series.ts'

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

test('keeps only transferable series that are not owned by the requesting Mangaka', () => {
  const catalog = [
    { id: 'serialized-other', status: 'SERIALIZED' },
    { id: 'hiatus-other', status: 'HIATUS' },
    { id: 'serialized-own', status: 'SERIALIZED' },
    { id: 'completing-other', status: 'COMPLETING' },
    { id: 'cancelling-other', status: 'CANCELLING' }
  ]

  assert.deepEqual(selectEligibleTransferSeries(catalog, [{ id: 'serialized-own' }]), [catalog[0], catalog[1]])
  assert.equal(isTransferEligibleSeriesStatus('SERIALIZED'), true)
  assert.equal(isTransferEligibleSeriesStatus('HIATUS'), true)
  assert.equal(isTransferEligibleSeriesStatus('COMPLETING'), false)
})
