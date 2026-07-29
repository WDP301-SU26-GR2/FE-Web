/* global require, console */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs')
const path = require('path')

function flatten(obj, prefix = '') {
  const out = []
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? prefix + '.' + k : k
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...flatten(v, key))
    else out.push(key)
  }
  return out
}

function loadAll(dir, ns) {
  const out = new Map()
  for (const lang of ['en', 'vi']) {
    const file = path.join(dir, `${lang}/${ns}.json`)
    const keys = new Set(flatten(JSON.parse(fs.readFileSync(file, 'utf8'))))
    for (const k of keys) out.set(k, (out.get(k) || new Set()).add(lang))
  }
  return out
}

// Parity
const namespaces = ['common', 'welcome', 'auth', 'profile', 'mangaka', 'assistant', 'admin', 'editor', 'board']

for (const ns of namespaces) {
  const map = loadAll('app/locales', ns)
  const missing = []
  for (const [k, langs] of map.entries()) {
    if (!langs.has('en')) missing.push(`[VI-only] ${k}`)
    if (!langs.has('vi')) missing.push(`[EN-only] ${k}`)
  }
  if (missing.length === 0) {
    console.log(`${ns}: OK (${map.size} keys, full EN/VI parity)`)
  } else {
    console.log(`${ns}: ASYMMETRY:`)
    for (const m of missing) console.log('  ' + m)
  }
}

// Key coverage
const enByNs = Object.fromEntries(
  namespaces.map((ns) => [ns, new Set(flatten(JSON.parse(fs.readFileSync(`app/locales/en/${ns}.json`, 'utf8'))))])
)

function hasTranslationKey(keys, key) {
  return keys?.has(key) || keys?.has(`${key}_one`) || keys?.has(`${key}_other`)
}

function scan(dir) {
  const missing = []
  if (!fs.existsSync(dir)) return missing
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f)
    const stat = fs.statSync(p)
    if (stat.isDirectory()) missing.push(...scan(p))
    else if (p.endsWith('.tsx') || p.endsWith('.ts')) {
      const txt = fs.readFileSync(p, 'utf8')
      const nsMatch = txt.match(
        /useTranslation\(\s*(?:\[['"](\w+)['"]\s*,\s*['"](\w+)['"]\]|\[['"](\w+)['"]\]|['"](\w+)['"])/
      )
      const roleNamespace = ['mangaka', 'assistant', 'admin', 'editor', 'board'].find((role) =>
        p.includes(`${path.sep}${role}${path.sep}`)
      )
      const namespaces = nsMatch
        ? nsMatch[1]
          ? [nsMatch[1], nsMatch[2]]
          : nsMatch[3]
            ? [nsMatch[3]]
            : [nsMatch[4]]
        : [roleNamespace ?? 'common']

      const re = /\bt\(\s*['"]([a-zA-Z][\w.]*)['"]/g
      let m
      while ((m = re.exec(txt)) !== null) {
        const key = m[1]
        const found = namespaces.some((ns) => hasTranslationKey(enByNs[ns], key))
        if (!found) missing.push(`${p} [${namespaces.join(',')}] -> ${key}`)
      }
    }
  }
  return missing
}

const missing = [...scan('app/features'), ...scan('app/routes'), ...scan('app/shared'), ...scan('app/providers')]
if (missing.length === 0) {
  console.log('Coverage: OK — every t() call resolves to a key in the corresponding namespace JSON.')
} else {
  console.log('MISSING keys:')
  for (const m of missing) console.log('  ' + m)
}
