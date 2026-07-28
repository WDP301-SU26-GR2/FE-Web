import type { FetchError } from '~/api/mutator/custom-fetch'

/**
 * Pull a human-readable message out of an error thrown by `customFetch`.
 *
 * BE error envelope: { success: false, code: string, message: string, errors?: [{ message, path }] }
 * - `message` is always a string (never an array).
 * - Field-level validation errors are in `errors[]` (used by form components to map per-field).
 * - Generic/system errors (403, 409, 500…) only have `message`, no `errors`.
 *
 * Falls back to the bare Error.message, then to a localized default.
 */
export function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (!error) return fallback

  if (error instanceof Error) {
    const fetchError = error as FetchError
    if (fetchError.data?.message) return fetchError.data.message
    if (error.message && error.message !== 'API error') {
      return error.message
    }
  }

  return fallback
}

/**
 * Read the success message preserved by `customFetch`.
 *
 * Message-bearing payloads (for example `{ data: { message } }`) take
 * precedence over the generic response envelope. Generic envelope messages
 * such as "Thành công" are replaced by the action-specific fallback so the
 * feedback still tells the user what actually happened.
 */
export function extractApiSuccessMessage(response: unknown, fallback: string): string {
  if (!response || typeof response !== 'object') return fallback

  const candidate = response as {
    message?: unknown
    data?: { message?: unknown } | null
  }
  const payloadMessage = cleanMessage(candidate.data?.message)
  if (payloadMessage) return payloadMessage

  const envelopeMessage = cleanMessage(candidate.message)
  if (envelopeMessage && !isGenericSuccessMessage(envelopeMessage)) return envelopeMessage

  return fallback
}

function cleanMessage(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const message = value.trim()
  return message || undefined
}

function isGenericSuccessMessage(message: string): boolean {
  return ['success', 'successful', 'ok', 'thành công', 'thao tác thành công'].includes(message.toLocaleLowerCase('vi'))
}

/** Stable machine-readable BE error code (Spec 21). */
export function extractApiErrorCode(error: unknown): string | undefined {
  if (!(error instanceof Error)) return undefined
  return (error as FetchError).data?.code
}

/**
 * Extract per-field validation errors from a `customFetch` error.
 * Returns a Map<fieldPath, errorMessage> for form field highlighting.
 */
export function extractFieldErrors(error: unknown): Map<string, string> {
  const fieldErrors = new Map<string, string>()

  if (error instanceof Error) {
    const fetchError = error as FetchError
    if (Array.isArray(fetchError.data?.errors)) {
      for (const err of fetchError.data.errors) {
        if (err.message && err.path) {
          fieldErrors.set(err.path, err.message)
        }
      }
    }
  }

  return fieldErrors
}
