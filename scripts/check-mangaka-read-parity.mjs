import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const [paymentRoute, en, vi] = await Promise.all([
  readFile(new URL('../app/routes/mangaka/payments.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../app/locales/en/mangaka.json', import.meta.url), 'utf8'),
  readFile(new URL('../app/locales/vi/mangaka.json', import.meta.url), 'utf8')
])

assert.match(paymentRoute, /paymentControllerGetPaymentsByContract/)
assert.match(paymentRoute, /paymentControllerGetPaymentsBySeries/)
assert.match(paymentRoute, /searchParams\.get\('view'\)/)

for (const locale of [JSON.parse(en), JSON.parse(vi)]) {
  assert.equal(typeof locale.finance.filters.all, 'string')
  assert.equal(typeof locale.finance.filters.byContract, 'string')
  assert.equal(typeof locale.finance.filters.bySeries, 'string')
}

console.log('Mangaka read-only API parity checks passed.')
