import test from 'node:test'
import assert from 'node:assert/strict'
import { isEmailNotVerifiedError } from './is-email-not-verified-error.ts'

test('recognizes the stable unverified-email error code', () => {
  const error = Object.assign(new Error('API error'), {
    data: { code: 'Error.EmailNotVerified', message: 'Tài khoản chưa xác thực email' }
  })

  assert.equal(isEmailNotVerifiedError(error), true)
})

test('does not recognize another authentication error', () => {
  const error = Object.assign(new Error('API error'), { data: { code: 'Error.InvalidCredentials' } })

  assert.equal(isEmailNotVerifiedError(error), false)
})
