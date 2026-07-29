import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const inviteSource = await readFile('app/features/assistant/invites/assistant-invites-page.tsx', 'utf8')
const studioSource = await readFile('app/features/mangaka/studio/my-studio-page.tsx', 'utf8')
const assignmentCardSource = await readFile('app/features/mangaka/assistants/components/assignment-card.tsx', 'utf8')
const studioCardSource = await readFile('app/features/mangaka/studio/components/studio-assignment-card.tsx', 'utf8')

test('invite detail is placed beneath a dedicated summary row', () => {
  assert.match(
    inviteSource,
    /<article className='flex flex-col gap-3[^']*'>\s*<div className='flex flex-col gap-3[^']*sm:flex-row/s
  )
  assert.doesNotMatch(inviteSource, /<article className='[^']*sm:flex-row/)
})

test('Mangaka Studio renders the detail-aware assignment card', () => {
  assert.match(studioSource, /StudioAssignmentCard/)
})

test('Mangaka Studio keeps its assignment detail control inside the card footer', () => {
  assert.match(assignmentCardSource, /onDetailsClick\?: \(\) => void/)
  assert.match(assignmentCardSource, /aria-expanded=\{isDetailsOpen\}/)
  assert.match(studioCardSource, /onDetailsClick=\{\(\) => setIsExpanded/)
  assert.match(studioCardSource, /taskTypes=\{isExpanded \? detail\.assignment\?\.assignedTaskTypes : undefined\}/)
  assert.doesNotMatch(studioCardSource, /<\/AssignmentCard>\s*<button/s)
})
