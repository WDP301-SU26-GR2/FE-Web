import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'

async function exists(path) {
  try {
    await access(new URL(path, import.meta.url))
    return true
  } catch {
    return false
  }
}

const [routes, nav, notifications, documentTitles, mangakaIndex, enMangakaRaw, viMangakaRaw, enCommonRaw, viCommonRaw] =
  await Promise.all([
    readFile(new URL('../app/routes.ts', import.meta.url), 'utf8'),
    readFile(new URL('../app/shared/components/dashboard-nav-config.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/shared/components/role-notifications-page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/shared/config/document-titles.ts', import.meta.url), 'utf8'),
    readFile(new URL('../app/features/mangaka/index.ts', import.meta.url), 'utf8'),
    readFile(new URL('../app/locales/en/mangaka.json', import.meta.url), 'utf8'),
    readFile(new URL('../app/locales/vi/mangaka.json', import.meta.url), 'utf8'),
    readFile(new URL('../app/locales/en/common.json', import.meta.url), 'utf8'),
    readFile(new URL('../app/locales/vi/common.json', import.meta.url), 'utf8')
  ])

const enMangaka = JSON.parse(enMangakaRaw)
const viMangaka = JSON.parse(viMangakaRaw)
const enCommon = JSON.parse(enCommonRaw)
const viCommon = JSON.parse(viCommonRaw)

assert.doesNotMatch(routes, /route\('reprints', 'routes\/mangaka\/reprints\.tsx'\)/)
assert.doesNotMatch(routes, /routes\/mangaka\/reprint-chapter-detail\.tsx/)
assert.doesNotMatch(nav, /\/dashboard\/mangaka\/reprints/)
assert.doesNotMatch(notifications, /return `\/dashboard\/mangaka\/reprints/)
assert.doesNotMatch(documentTitles, /\/dashboard\/mangaka\/reprints/)
assert.doesNotMatch(mangakaIndex, /export .*['"]\.\/reprints/)
assert.equal('reprints' in enMangaka, false)
assert.equal('reprints' in viMangaka, false)
assert.equal('reprints' in enCommon.nav, false)
assert.equal('reprints' in viCommon.nav, false)
assert.equal(typeof enMangaka.finance.source.REPRINT, 'string')
assert.equal(typeof viMangaka.finance.source.REPRINT, 'string')
assert.equal(typeof enCommon.contractShared.decision.types.REPRINT, 'string')
assert.equal(typeof viCommon.contractShared.decision.types.REPRINT, 'string')
assert.equal(await exists('../app/routes/mangaka/reprints.tsx'), false)
assert.equal(await exists('../app/routes/mangaka/reprint-chapter-detail.tsx'), false)
assert.equal(await exists('../app/features/mangaka/reprints'), false)
assert.equal(await exists('../app/api/operations/reprint-requests/reprint-requests.ts'), true)
assert.equal(await exists('../app/api/model/reprint-requests'), true)
assert.match(routes, /route\('operations\/reprints', 'routes\/editor\/operations-reprints\.tsx'\)/)
assert.match(routes, /route\('reprints', 'routes\/board\/reprints\.tsx'\)/)
assert.match(notifications, /return `\/dashboard\/editor\/operations\/reprints\?requestId=\$\{id\}`/)
assert.match(notifications, /return `\/dashboard\/board\/reprints\?requestId=\$\{id\}`/)
assert.match(documentTitles, /dashboard\\\/editor\\\/operations\\\/reprints/)
assert.match(documentTitles, /dashboard\\\/board\\\/reprints/)
assert.match(notifications, /REPRINT:\s*'REPRINT_REQUEST'/)

console.log('Mangaka reprint removal contract: PASS')
