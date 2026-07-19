/**
 * Post-generation script: organize flat model files into per-tag folders.
 *
 * Why: Orval generates all schemas into a single flat `app/api/model/` folder
 * regardless of which API tag they belong to. We want a structure that mirrors
 * `app/api/operations/<tag>/` so files are easier to navigate and grep.
 *
 * What this script does:
 *   1. Parses each `operations/<tag>/<tag>.ts` and `.msw.ts` to find which
 *      schema types it imports from the barrel `../../model`.
 *   2. Moves each `model/<schema>.ts` into `model/<tag>/<schema>.ts`,
 *      based on the tag(s) that import it. If multiple tags share a schema,
 *      it goes under the FIRST tag (lexicographic) to keep a single source
 *      of truth.
 *   3. Rewrites imports inside `operations/<tag>/**` from
 *        `from '../../model'`
 *      to
 *        `from '../../model/<tag>'`
 *   4. Regenerates `app/api/model/index.ts` as a barrel over the per-tag
 *      sub-folders so legacy `from '~/api/model'` imports still work.
 *
 * Idempotent: re-running on an already-organized tree is a no-op (after the
 * first run, `operations/<tag>/*.ts` no longer imports `'../../model'`, so
 * the parse finds nothing to do).
 *
 * Run: node scripts/organize-models-by-tag.mjs
 * Wired via `hooks.afterAllFilesWrite` in orval.config.ts.
 */
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  mkdirSync,
  renameSync,
  statSync,
  existsSync,
  rmSync,
} from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const ROOT = join(__dirname, '..')
const OPERATIONS_DIR = join(ROOT, 'app/api/operations')
const MODEL_DIR = join(ROOT, 'app/api/model')

// ─── helpers ────────────────────────────────────────────────────────────────

/** Walk a directory recursively, yielding file paths. */
function* walkFiles(dir) {
  if (!existsSync(dir)) return
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) yield* walkFiles(full)
    else yield full
  }
}

/**
 * Read a generated operations file and extract the list of schema type names
 * it imports from a per-tag model folder. Matches BOTH the legacy flat form
 * and the per-tag form:
 *   `import type { Foo, Bar } from '../../model';`
 *   `import type { Foo, Bar } from '../../model/<tag>';`
 * Used by phase 1 (initial scan) — phase 4 uses `extractSchemaImports`.
 *
 * Phase 1 only acts when the legacy form is present; if everything is
 * already per-tag, returns null and the script falls back to filesystem scan.
 */
function extractSchemaImportsFromFlatBarrel(filePath) {
  const content = readFileSync(filePath, 'utf-8')
  const re =
    /import\s+type\s*\{([^}]+)\}\s*from\s*['"]\.\.\/\.\.\/model['"]\s*;?/g
  const types = new Set()
  let match
  while ((match = re.exec(content)) !== null) {
    for (const raw of match[1].split(',')) {
      const name = raw.trim()
      if (name) types.add(name)
    }
  }
  return types.size > 0 ? types : null
}

/**
 * Like above, but matches BOTH the flat and per-tag forms. Used by phase 4
 * to drive cross-tag re-exports, where we need to know what every tag uses
 * regardless of which import form is in the file.
 */
function extractSchemaImports(filePath) {
  const content = readFileSync(filePath, 'utf-8')
  const re =
    /import\s+type\s*\{([^}]+)\}\s*from\s*['"]\.\.\/\.\.\/model(?:\/[^'"]+)?['"]\s*;?/g
  const types = new Set()
  let match
  while ((match = re.exec(content)) !== null) {
    for (const raw of match[1].split(',')) {
      const name = raw.trim()
      if (name) types.add(name)
    }
  }
  return types
}

/**
 * Reverse-map: PascalCase type → camelCase / kebab-case file name.
 * Mirrors orval's conventionName(name, namingConvention) where
 * namingConvention defaults to 'camel' for file names.
 */
function typeToFileName(typeName) {
  return typeName.charAt(0).toLowerCase() + typeName.slice(1)
}

// ─── 1. Build tag → schemaTypes map ─────────────────────────────────────────

console.log('[organize-models] scanning operations for schema usage...')

const tagToSchemas = new Map() // tag -> Set<typeName>
const schemaToTag = new Map() // typeName -> tag (first owner wins)

const tagDirs = readdirSync(OPERATIONS_DIR).filter((name) => {
  const full = join(OPERATIONS_DIR, name)
  return statSync(full).isDirectory()
})

for (const tag of tagDirs) {
  const tagDir = join(OPERATIONS_DIR, tag)
  const used = new Set()
  for (const file of walkFiles(tagDir)) {
    if (!file.endsWith('.ts')) continue
    const types = extractSchemaImportsFromFlatBarrel(file)
    if (!types) continue
    for (const t of types) used.add(t)
  }
  if (used.size > 0) {
    tagToSchemas.set(tag, used)
    for (const t of used) {
      if (!schemaToTag.has(t)) schemaToTag.set(t, tag)
    }
  }
}

if (schemaToTag.size === 0) {
  console.log(
    '[organize-models] no flat-barrel imports found — operations already per-tag.',
  )
  console.log('[organize-models] (re)building barrels from existing model/ tree...')
  // Skip phases 2-3 (nothing to move/rewrite), but still rebuild barrels.
  const existingTagFolders = readdirSync(MODEL_DIR)
    .filter((name) => statSync(join(MODEL_DIR, name)).isDirectory())
    .sort()
  if (existingTagFolders.length === 0) {
    console.log('[organize-models] no tag folders found, nothing to do.')
    process.exit(0)
  }
  // Fall through to phase 4 below using these folders.
  var _fallbackTagFolders = existingTagFolders
}

// ─── 1b. Expand schemaToTag with transitive relative-import deps ───────────
// Sub-schemas (enum types, array item types) are imported via relative paths
// like `./createProposalBodyDtoPublicationType` from inside their parent file.
// Orval generates each of these as its own .ts file but operations never
// reference them directly — so the operations-scan above won't see them.
// We still need to move them to the right tag folder so the parent file's
// relative imports keep resolving.
//
// Strategy: BFS through relative `./X` imports starting from each schema
// in schemaToTag, and assign every reachable file the same tag. If a file
// is reached from multiple tags, the first one wins (consistent with the
// schemaToTag policy above).

function collectRelativeDeps(filePath, seen) {
  if (seen.has(filePath)) return seen
  seen.add(filePath)
  let content
  try {
    content = readFileSync(filePath, 'utf-8')
  } catch {
    return seen
  }
  // Match `import type { Foo } from './bar';` and `from '../baz';` etc.
  // We only care about same-directory siblings (start with `./`).
  const re = /import\s+type\s*\{[^}]+\}\s*from\s*['"]\.\/([^'"]+)['"]/g
  let m
  while ((m = re.exec(content)) !== null) {
    const relTarget = m[1].replace(/\.ts$/, '') + '.ts'
    const sibling = join(dirname(filePath), relTarget)
    if (existsSync(sibling)) collectRelativeDeps(sibling, seen)
  }
  return seen
}

const expandedSchemaToTag = new Map(schemaToTag)

// When the tree is already organized, phase 1 cannot recover ownership from
// flat imports. Rebuild the ownership map from the existing tag folders so
// phase 4 can still emit cross-tag re-exports for shared response schemas.
if (typeof _fallbackTagFolders !== 'undefined') {
  for (const tag of _fallbackTagFolders) {
    const tagDir = join(MODEL_DIR, tag)
    for (const file of readdirSync(tagDir)) {
      if (!file.endsWith('.ts') || file === 'index.ts') continue
      const base = basename(file, '.ts')
      const inferredType = base.charAt(0).toUpperCase() + base.slice(1)
      if (!expandedSchemaToTag.has(inferredType)) {
        expandedSchemaToTag.set(inferredType, tag)
      }
    }
  }
}

for (const [typeName, tag] of [...schemaToTag]) {
  const fileName = typeToFileName(typeName) + '.ts'
  const src = join(MODEL_DIR, fileName)
  if (!existsSync(src)) continue
  const cluster = collectRelativeDeps(src, new Set())
  for (const file of cluster) {
    // file is a model/<name>.ts absolute path. Strip to type name (PascalCase).
    const base = basename(file, '.ts')
    const inferredType = base.charAt(0).toUpperCase() + base.slice(1)
    if (!expandedSchemaToTag.has(inferredType)) {
      expandedSchemaToTag.set(inferredType, tag)
    }
  }
}

// Rebuild tagToSchemas with expanded set so we can log accurately
const expandedTagToSchemas = new Map()
for (const [typeName, tag] of expandedSchemaToTag) {
  if (!expandedTagToSchemas.has(tag)) expandedTagToSchemas.set(tag, new Set())
  expandedTagToSchemas.get(tag).add(typeName)
}

// ─── 2. Move schema files into per-tag folders ──────────────────────────────

if (expandedSchemaToTag.size > 0) {
  console.log(
    `[organize-models] mapping ${expandedSchemaToTag.size} schema(s) across ${expandedTagToSchemas.size} tag(s):`,
  )
  for (const [tag, types] of expandedTagToSchemas) {
    console.log(`  ${tag}: ${types.size} type(s)`)
  }
}

const movedFiles = new Set() // absolute paths we relocated, so we don't double-process

if (expandedSchemaToTag.size > 0) {
  for (const [typeName, tag] of expandedSchemaToTag) {
    const fileName = typeToFileName(typeName) + '.ts'
    const src = join(MODEL_DIR, fileName)
    if (!existsSync(src)) {
      // Could be a path-param type that lives in its own file with a different
      // name; orval names these after their controller. Skip silently.
      continue
    }
    const destDir = join(MODEL_DIR, tag)
    mkdirSync(destDir, { recursive: true })
    const dest = join(destDir, fileName)
    if (src === dest) continue
    renameSync(src, dest)
    movedFiles.add(src)
  }
}

// ─── 3. Rewrite imports inside operations/<tag>/** ─────────────────────────

if (expandedSchemaToTag.size > 0) {
  console.log('[organize-models] rewriting imports in operations/...')

  for (const tag of tagDirs) {
    const tagDir = join(OPERATIONS_DIR, tag)
    for (const file of walkFiles(tagDir)) {
      if (!file.endsWith('.ts')) continue
      let content = readFileSync(file, 'utf-8')
      const before = content
      content = content.replace(
        /from\s+['"]\.\.\/\.\.\/model['"]/g,
        `from '../../model/${tag}'`,
      )
      if (content !== before) {
        writeFileSync(file, content, 'utf-8')
        console.log(`  patched: ${file.replace(ROOT + '\\', '')}`)
      }
    }
  }
}

// ─── 4. Rebuild per-tag barrel + root barrel ────────────────────────────────

console.log('[organize-models] regenerating model barrels...')

const tagFolders =
  typeof _fallbackTagFolders !== 'undefined'
    ? _fallbackTagFolders
    : [...new Set(expandedSchemaToTag.values())].sort()

// 4a. Per-tag barrel: model/<tag>/index.ts
//
// Two issues to handle:
//   (a) Re-exports of files owned by THIS tag (just `./<file>`).
//   (b) Re-exports of types USED by operations of this tag but OWNED by
//       another tag (i.e. `export { X } from '../<otherTag>/<file>'`).
//       Without this, cross-tag type usage like
//         series-names importing ReasonBodyDto (owned by series)
//       breaks after the move.

for (const tag of tagFolders) {
  const tagDir = join(MODEL_DIR, tag)
  if (!existsSync(tagDir)) continue
  const localFiles = readdirSync(tagDir)
    .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
    .sort()

  // Collect every type this tag uses, from its operations files.
  const usedTypes = new Set()
  const opsTagDir = join(OPERATIONS_DIR, tag)
  if (existsSync(opsTagDir)) {
    for (const f of walkFiles(opsTagDir)) {
      if (!f.endsWith('.ts')) continue
      for (const x of extractSchemaImports(f)) usedTypes.add(x)
    }
  }

  // For each used type, find its owner. If the owner is a different tag,
  // emit a re-export line.
  const crossTagLines = []
  for (const typeName of usedTypes) {
    const owner = expandedSchemaToTag.get(typeName)
    if (!owner || owner === tag) continue
    const fileBase = typeToFileName(typeName)
    // Named export: `export type { X } from '../<owner>/<fileBase>';`
    crossTagLines.push(
      `export type { ${typeName} } from '../${owner}/${fileBase}';`,
    )
  }

  const localExports = localFiles.map(
    (f) => `export * from './${f.replace(/\.ts$/, '')}'`,
  )

  const barrelLines = [
    '/**',
    ` * Auto-generated barrel for the ${tag} tag.`,
    ' * Regenerated by scripts/organize-models-by-tag.mjs after each orval run.',
    ' *',
    ' * Local files are exported directly. Types that belong to OTHER tags',
    ' * but are used here are re-exported as named types for convenience.',
    ' */',
    ...localExports,
    ...crossTagLines,
    '',
  ]
  writeFileSync(join(tagDir, 'index.ts'), barrelLines.join('\n') + '\n', 'utf-8')
}

// 4b. Root barrel: model/index.ts
const rootBarrelLines = [
  '/**',
  ' * Auto-generated barrel over per-tag model sub-folders.',
  ' * Regenerated by scripts/organize-models-by-tag.mjs after each orval run.',
  ' *',
  ' * Prefer importing from the specific tag folder:',
  ' *   import type { LoginBodyDto } from \'~/api/model/auth\'',
  ' */',
  ...tagFolders.map((t) => `export * from './${t}'`),
  '',
]
writeFileSync(join(MODEL_DIR, 'index.ts'), rootBarrelLines.join('\n') + '\n', 'utf-8')

// ─── 5. Remove the stale flat .d.ts / leftover files inside model/ root ─────

for (const entry of readdirSync(MODEL_DIR)) {
  const full = join(MODEL_DIR, entry)
  const stat = statSync(full)
  if (stat.isDirectory()) continue
  if (entry === 'index.ts') continue
  if (movedFiles.has(full)) continue
  // Anything else left at root (e.g. .d.ts, leftover after a rename) — drop.
  console.log(`  removing stale file: ${entry}`)
  rmSync(full, { force: true })
}

console.log('[organize-models] done.')
