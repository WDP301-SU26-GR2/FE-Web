// @ts-expect-error Node's type-stripping test runner requires the explicit extension.
import { extractApiErrorCode } from '../../../shared/lib/api/extract-api-error.ts'

export function isEmailNotVerifiedError(error: unknown): boolean {
  return extractApiErrorCode(error) === 'Error.EmailNotVerified'
}
