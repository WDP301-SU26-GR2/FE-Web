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

  if (
    !(error instanceof Error) &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    const message = error.message.trim()
    if (message && !message.startsWith('Error.')) return message
  }

  if (error instanceof Error) {
    const fetchError = error as FetchError
    if (fetchError.data?.message) {
      return fetchError.data.message.startsWith('Error.') ? fallback : fetchError.data.message
    }
    if (error.message && error.message !== 'API error') {
      return error.message.startsWith('Error.') ? fallback : error.message
    }
  }

  return fallback
}

/** Stable machine-readable BE error code (Spec 21). */
export function extractApiErrorCode(error: unknown): string | undefined {
  if (!(error instanceof Error)) return undefined
  const data = (error as FetchError).data
  if (data?.code) return data.code
  if (data?.message?.startsWith('Error.')) return data.message
  const fieldCode = data?.errors?.find((item) => item.code?.startsWith('Error.'))?.code
  return fieldCode ?? undefined
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
