import test from 'node:test'
import assert from 'node:assert/strict'

import { formatDeadlineDate } from './format-deadline-date.ts'

test('formats deadline dates as day/month/year', () => {
  const formatted = formatDeadlineDate('2026-10-05T03:19:00.000Z')

  assert.match(formatted, /05\/10\/2026/)
  assert.doesNotMatch(formatted, /10\/05\/2026/)
})
