import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const detailPagePath = resolve(dirname(fileURLToPath(import.meta.url)), '../my-series-detail-page.tsx')
const lifecycleHookPath = resolve(dirname(fileURLToPath(import.meta.url)), '../use-series-lifecycle.ts')
const completionDialogPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../components/completion-proposal-dialog.tsx'
)
const lifecycleResultPath = resolve(dirname(fileURLToPath(import.meta.url)), '../lifecycle-action-result.ts')

test('series detail keeps the route edit action and removes the metadata popup action', async () => {
  const source = await readFile(detailPagePath, 'utf8')

  assert.match(source, /navigate\(`\/dashboard\/mangaka\/series\/\$\{series\.id\}\/edit`\)/)
  assert.doesNotMatch(source, /PenLine/)
  assert.doesNotMatch(source, /SeriesMetadataDialog/)
  assert.doesNotMatch(source, /metadataDialogOpen/)
  assert.doesNotMatch(source, /canEditSeriesMetadata/)
})

test('Mangaka series detail no longer exposes the completion proposal flow', async () => {
  const [detailSource, lifecycleSource] = await Promise.all([
    readFile(detailPagePath, 'utf8'),
    readFile(lifecycleHookPath, 'utf8')
  ])

  assert.doesNotMatch(
    detailSource,
    /CompletionProposalDialog|completionDialogOpen|canProposeCompletion|proposeCompletion/
  )
  assert.doesNotMatch(detailSource, /series\.completionProposal|lifecycle\.completion/)
  assert.doesNotMatch(lifecycleSource, /seriesControllerProposeCompletion|proposeCompletion|completion/)
  await assert.rejects(readFile(completionDialogPath, 'utf8'), (error) => error?.code === 'ENOENT')
  await assert.rejects(readFile(lifecycleResultPath, 'utf8'), (error) => error?.code === 'ENOENT')
})
