import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const page = readFileSync('app/features/mangaka/assistants/assistant-directory-page.tsx', 'utf8')
const hook = readFileSync('app/features/mangaka/assistants/use-assistant-directory.ts', 'utf8')

for (const source of [page, hook]) {
  for (const symbol of ['setLevel', 'setQuery', 'setAvailableFrom', 'setAvailableTo']) {
    assert.equal(source.includes(symbol), false, `${symbol} must be removed`)
  }
}

assert.equal(page.includes('namePlaceholder'), false)
assert.equal(page.includes('levelPlaceholder'), false)
assert.equal(page.includes("type='datetime-local'"), false)
assert.equal(hook.includes('params.q ='), false)
assert.equal(hook.includes('params.level ='), false)
assert.equal(hook.includes('params.availableFrom ='), false)
assert.equal(hook.includes('params.availableTo ='), false)
