import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const files = [
  'app/features/mangaka/notifications/mangaka-notifications-page.tsx',
  'app/features/assistant/notifications/assistant-notifications-page.tsx',
  'app/shared/components/role-notifications-page.tsx'
]

test('notification items do not render technical reference metadata', async () => {
  for (const file of files) {
    const source = await readFile(file, 'utf8')
    assert.doesNotMatch(source, /notifications(?:Page)?\.item\.reference/)
  }
})
