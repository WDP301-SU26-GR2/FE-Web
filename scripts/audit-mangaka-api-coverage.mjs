import fs from 'node:fs'
import path from 'node:path'

const workspace = process.cwd()
const guide = fs.readFileSync(path.join(workspace, 'FE-Web-Guide/03-mangaka.md'), 'utf8')
const swagger = JSON.parse(fs.readFileSync(path.join(workspace, 'swagger.json'), 'utf8'))

const sourceRoots = [
  'app/features/mangaka',
  'app/routes/mangaka',
  'app/features/auth',
  'app/features/profile',
  'app/shared/lib/upload',
  'app/shared/hooks',
  'app/shared/components/contracts',
  'app/routes/auth/change-password.tsx',
  'app/shared/components/notification-bell.tsx'
]

const source = sourceRoots
  .flatMap((root) => collectSourceFiles(path.join(workspace, root)))
  .map((file) => fs.readFileSync(file, 'utf8'))
  .join('\n')

// Explicit product decisions or guide mentions that are not Mangaka UI routes.
const excluded = new Set([
  'POST /tasks/batch',
  'POST /annotations',
  'GET /annotations',
  'GET /annotations/:id',
  'PATCH /annotations/:id/resolve',
  'DELETE /annotations/:id',
  'POST /contracts',
  'PUT /chapters/:id/schedule',
  'GET /tasks/:id/download-url',
  'GET /revision-requests/:id',
  'GET /contracts/health',
  'GET /staff/:userId',
  'GET /reprint-requests',
  'GET /reprint-requests/:id',
  'GET /reprint-requests/:id/chapters',
  'GET /reprint-requests/:id/chapters/:chapterId',
  'PATCH /reprint-requests/:id/chapters/:chapterId/manuscript',
  'PATCH /reprint-requests/:id/mangaka-review'
])

const documentedRoutes = [...guide.matchAll(/\b(GET|POST|PUT|PATCH|DELETE) (\/[^^`\s|)]+)/g)]
  .map((match) => `${match[1]} ${match[2].split('?')[0]}`)
  .filter((route) => !excluded.has(route))

const uniqueRoutes = [...new Set(documentedRoutes)].sort()
const swaggerOperations = new Map()

for (const [swaggerPath, pathItem] of Object.entries(swagger.paths ?? {})) {
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    const operation = pathItem[method]
    if (!operation?.operationId) continue
    swaggerOperations.set(`${method.toUpperCase()} ${normalizePath(swaggerPath)}`, operation.operationId)
  }
}

const rows = uniqueRoutes.map((route) => {
  const [method, routePath] = route.split(' ')
  const operationId = swaggerOperations.get(`${method} ${normalizePath(routePath)}`)
  const clientName = operationId ? toOrvalClientName(operationId) : null
  return {
    route,
    clientName,
    covered: Boolean(clientName && new RegExp(`\\b${escapeRegex(clientName)}\\b`).test(source))
  }
})

const unresolved = rows.filter((row) => !row.clientName)
const missing = rows.filter((row) => row.clientName && !row.covered)
const coveredCount = rows.length - unresolved.length - missing.length

console.log(`Mangaka API coverage: ${coveredCount}/${rows.length} documented, non-excluded routes referenced.`)
if (unresolved.length) {
  console.log('\nNot found in current Swagger:')
  for (const row of unresolved) console.log(`- ${row.route}`)
}
if (missing.length) {
  console.log('\nNot referenced by Mangaka/common UI source:')
  for (const row of missing) console.log(`- ${row.route} -> ${row.clientName}`)
}

process.exitCode = missing.length ? 1 : 0

function normalizePath(value) {
  return value.replace(/:[^/]+|\{[^/]+\}/g, '{}').replace(/\/$/, '') || '/'
}

function toOrvalClientName(operationId) {
  const camel = operationId.replace(/_([a-zA-Z0-9])/g, (_, char) => char.toUpperCase())
  return camel.charAt(0).toLowerCase() + camel.slice(1)
}

function collectSourceFiles(target) {
  if (!fs.existsSync(target)) return []
  const stat = fs.statSync(target)
  if (stat.isFile()) return /\.[cm]?[jt]sx?$/.test(target) ? [target] : []
  return fs
    .readdirSync(target, { withFileTypes: true })
    .flatMap((entry) => collectSourceFiles(path.join(target, entry.name)))
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
