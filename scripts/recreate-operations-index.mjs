/**
 * Recreates app/api/operations/index.ts barrel after Orval runs.
 * Orval deletes it because clean: true wipes the entire operations folder.
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

const barrelContent = `// Auto-generated barrel — ORVAL SẼ XOÁ FILE NÀY KHI CHẠY npm run orval
// Script scripts/recreate-operations-index.mjs sẽ tự tạo lại
export * from './auth/auth'
export * from './series/series'
export * from './series-names/series-names'
export * from './reviews/reviews'
export * from './uploads/uploads'
export * from './users/users'
`

const targetPath = `${__dirname}/../app/api/operations/index.ts`
writeFileSync(targetPath, barrelContent, 'utf-8')
console.log('Recreated:', targetPath)
