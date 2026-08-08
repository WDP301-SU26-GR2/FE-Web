import assert from 'node:assert/strict'
import test from 'node:test'

import routes from '../../routes.ts'

function flattenRoutes(nodes, parentPath = '') {
  return nodes.flatMap((node) => {
    const path = [parentPath, node.path].filter(Boolean).join('/')
    const current = node.path ? [path] : []
    return [...current, ...(node.children ? flattenRoutes(node.children, path) : [])]
  })
}

test('Mangaka no longer exposes rankings while Board still does', () => {
  const paths = flattenRoutes(routes)

  assert.equal(paths.includes('dashboard/mangaka/rankings'), false)
  assert.equal(paths.includes('dashboard/board/rankings'), true)
})
