/**
 * Post-generation script: replaces the Orval-generated `// @ts-ignore` comment with
 * `// @ts-expect-error` to satisfy the `@typescript-eslint/ban-ts-comment` rule.
 * Idempotent: if `@ts-expect-error` is already present, skips the file.
 *
 * Run: node scripts/fix-generated-types.mjs
 * Or automatically via Orval afterWrite hook.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const operationsDir = join(__dirname, '../app/api/operations')

const REPLACE_PATTERN = /\/\/\s*@ts-ignore.*\n/g
const REPLACEMENT = '// @ts-expect-error -- generated file — HeadersInit spread incompatibility with TS strict mode\n'
const SUPPRESS_CHECK = '@ts-expect-error -- generated file'

function processFile(filePath) {
  if (!filePath.endsWith('.ts')) return
  const content = readFileSync(filePath, 'utf-8')
  if (content.includes(SUPPRESS_CHECK)) return
  if (!REPLACE_PATTERN.test(content)) return
  const newContent = content.replace(REPLACE_PATTERN, REPLACEMENT)
  writeFileSync(filePath, newContent, 'utf-8')
  console.log('Patched:', filePath)
}

function walkDir(dir) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      walkDir(fullPath)
    } else {
      processFile(fullPath)
    }
  }
}

walkDir(operationsDir)
console.log('Done.')
