import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const readerSourcePath = resolve(dirname(fileURLToPath(import.meta.url)), '../publication-pages-reader-view.tsx')
const readerSource = await readFile(readerSourcePath, 'utf8')

test('publication page cards do not expose per-page edit controls', () => {
  assert.doesNotMatch(readerSource, /PencilLine/)
  assert.doesNotMatch(readerSource, /useUpdatePage/)
  assert.doesNotMatch(readerSource, /UpdatePageNumberDialog/)
  assert.doesNotMatch(readerSource, /renumberPage/)
  assert.match(readerSource, /Trash2/)
})
