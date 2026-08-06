import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

test('Vietnamese profile uses Danh mục dự án for portfolio labels', async () => {
  const profile = JSON.parse(await read('app/locales/vi/profile.json'))

  assert.equal(profile.sections.portfolio, 'Danh mục dự án')
  assert.equal(profile.fields.portfolio, 'Danh mục dự án')
  assert.equal(profile.portfolioAlt, 'Ảnh Danh mục dự án')
})

test('create-chapter dialog uses Vietnamese chapter wording without internal details', async () => {
  const vi = JSON.parse(await read('app/locales/vi/mangaka.json'))
  const en = JSON.parse(await read('app/locales/en/mangaka.json'))
  const dialog = await read('app/features/mangaka/chapters/create-chapter-dialog.tsx')
  const createVi = vi.seriesDetail.publication.create
  const createEn = en.seriesDetail.publication.create

  assert.equal(createVi.dialogTitle, 'Tạo chương mới')
  assert.equal(createVi.confirm, 'Tạo chương')
  assert.equal(createVi.creating, 'Đang tạo...')
  assert.equal(createVi.success, 'Đã tạo chương mới.')
  assert.equal(createVi.errorGeneric, 'Không thể tạo chương. Vui lòng thử lại.')
  assert.equal('dialogDescription' in createVi, false)
  assert.equal('dialogDescription' in createEn, false)
  assert.doesNotMatch(dialog, /aria-describedby=/)
  assert.doesNotMatch(dialog, /\{seriesId\}/)
})

test('Mangaka Vietnamese locale does not expose the requested English role terms', async () => {
  const mangaka = JSON.parse(await read('app/locales/vi/mangaka.json'))
  const values = []
  const collectStrings = (value) => {
    if (typeof value === 'string') {
      values.push(value)
      return
    }
    if (Array.isArray(value)) {
      value.forEach(collectStrings)
      return
    }
    if (value && typeof value === 'object') {
      Object.values(value).forEach(collectStrings)
    }
  }

  collectStrings(mangaka)

  const forbidden = /\b(?:chapter|editor|assistant|board)\b|(?:^|\s)ch\./i
  assert.deepEqual(
    values.filter((value) => forbidden.test(value)),
    []
  )
})
