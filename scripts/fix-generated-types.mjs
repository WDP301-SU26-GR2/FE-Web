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
const INVALID_FAKER_OBJECT_SPREAD =
  /thresholdConfig:\s*\{\.\.\.faker\.helpers\.arrayElement\([\s\S]*?\),\},\s*payoutAmount:/g

function processFile(filePath) {
  if (!filePath.endsWith('.ts')) return
  const content = readFileSync(filePath, 'utf-8')
  let newContent = content
  if (!content.includes(SUPPRESS_CHECK)) newContent = newContent.replace(REPLACE_PATTERN, REPLACEMENT)
  // Orval can generate an object spread from a primitive union for
  // `Record<string, unknown>` schemas. An empty object is a valid mock and
  // keeps generated MSW handlers compatible with strict TypeScript.
  newContent = newContent.replace(INVALID_FAKER_OBJECT_SPREAD, 'thresholdConfig: {}, payoutAmount:')
  if (newContent === content) return
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
