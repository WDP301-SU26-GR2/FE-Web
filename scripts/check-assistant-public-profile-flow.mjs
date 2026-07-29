import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const hook = readFileSync('app/features/mangaka/assistants/use-assistant-public-profile.ts', 'utf8')
const dialog = readFileSync('app/features/mangaka/assistants/components/assistant-public-profile-dialog.tsx', 'utf8')
const card = readFileSync('app/features/mangaka/assistants/components/assistant-card.tsx', 'utf8')

assert.match(hook, /usersControllerGetAssistantProfile/)
assert.match(hook, /reviewsControllerListAssistantReviews/)
assert.match(hook, /assistantId:\s*userId/)
assert.match(hook, /limit:\s*10/)
assert.match(dialog, /assistantDirectory\.profile\.reviews/)
assert.match(card, /onViewDetails/)

console.log('Assistant public profile flow contract: PASS')
