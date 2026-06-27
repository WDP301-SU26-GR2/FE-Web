/**
 * Fetches swagger.json from the backend and saves it locally.
 * Orval will read from this local file for stable builds.
 *
 * Usage: npm run orval:fetch
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

const SWAGGER_URL = 'https://api-mangaka.novaproj.site/api-json'
const TARGET = `${__dirname}/../swagger.json`

console.log(`Fetching ${SWAGGER_URL}...`)

const response = await fetch(SWAGGER_URL)

if (!response.ok) {
  throw new Error(`Fetch failed: HTTP ${response.status} ${response.statusText}`)
}

const json = await response.json()
writeFileSync(TARGET, JSON.stringify(json, null, 2), 'utf-8')
console.log(`Saved ${TARGET}`)
console.log(`OpenAPI version: ${json.openapi ?? json.swagger ?? 'unknown'}`)
console.log(`Paths: ${Object.keys(json.paths ?? {}).length}`)
console.log(`Schemas: ${Object.keys(json.components?.schemas ?? json.definitions ?? {}).length}`)
