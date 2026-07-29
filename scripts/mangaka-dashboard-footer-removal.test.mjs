import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('mangaka dashboard omits the obsolete footer controls', async () => {
  const [dashboard, enLocaleRaw, viLocaleRaw] = await Promise.all([
    readFile('app/features/mangaka/dashboard/mangaka-dashboard.tsx', 'utf8'),
    readFile('app/locales/en/mangaka.json', 'utf8'),
    readFile('app/locales/vi/mangaka.json', 'utf8')
  ])

  const enLocale = JSON.parse(enLocaleRaw)
  const viLocale = JSON.parse(viLocaleRaw)

  assert.doesNotMatch(dashboard, /Dashboard Footer/)
  assert.doesNotMatch(dashboard, /dashboard\.(uploadBatch|editorSupport|engineStatus)/)
  assert.equal('uploadBatch' in enLocale.dashboard, false)
  assert.equal('editorSupport' in enLocale.dashboard, false)
  assert.equal('engineStatus' in enLocale.dashboard, false)
  assert.equal('uploadBatch' in viLocale.dashboard, false)
  assert.equal('editorSupport' in viLocale.dashboard, false)
  assert.equal('engineStatus' in viLocale.dashboard, false)
})
