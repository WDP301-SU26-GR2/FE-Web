import { storageControllerSignUpload } from '~/api/operations/uploads/uploads'
import type { SignUploadBodyDtoAssetType, SignUploadResDtoOutput } from '~/api/model/uploads'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

/**
 * Upload helpers — presigned PUT to Cloudflare R2.
 *
 * Two flavors:
 *   - `uploadToR2(file, assetType?)` → `string` (R2 `key`)
 *       For assets that only need to be referenced by key
 *       (cover image, avatar, character design, manuscript page, ...).
 *
 *   - `uploadAssetToR2(file, assetType?)` → `{ key, assetId }`
 *       For assets that need to be linked to a domain entity via `assetId`
 *       (e.g. `CreateTaskInput.assetIds[]`). The backend's `/uploads/sign`
 *       always returns both `key` and `assetId`, so this is the same
 *       presigned-PUT flow — only the return shape differs.
 *
 * Both wrappers have a `*WithMessage` variant that swallows errors into a
 * `{ error }` object suitable for form UIs that prefer non-throwing flow.
 *
 * Flow:
 *   1. POST /uploads/sign → { uploadUrl, key, requiredHeaders, assetId }
 *   2. PUT file bytes to uploadUrl with requiredHeaders
 *   3. Return persisted identifiers.
 */

const ALLOWED_CONTENT_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf'
] as const

type ContentType = (typeof ALLOWED_CONTENT_TYPES)[number]

function narrowContentType(file: File): ContentType {
  if ((ALLOWED_CONTENT_TYPES as readonly string[]).includes(file.type)) {
    return file.type as ContentType
  }
  throw new Error(`Unsupported content type: ${file.type}`)
}

export interface UploadedAsset {
  key: string
  assetId: string
}

async function signAndPut(
  file: File,
  assetType: SignUploadBodyDtoAssetType | undefined
): Promise<UploadedAsset> {
  const response = await storageControllerSignUpload({
    fileName: file.name,
    contentType: narrowContentType(file),
    contentLength: file.size,
    ...(assetType ? { assetType } : {})
  })
  const signData = response.data as SignUploadResDtoOutput

  const putRes = await fetch(signData.uploadUrl, {
    method: 'PUT',
    headers: signData.requiredHeaders,
    body: file
  })
  if (!putRes.ok) {
    throw new Error(`Upload to R2 failed: ${putRes.status} ${putRes.statusText}`)
  }

  return { key: signData.key, assetId: signData.assetId }
}

// ─── key-only variants ────────────────────────────────────────────────────

/**
 * Upload and return only the persisted R2 `key`.
 *
 * Throws the original `FetchError` if signing fails, or a plain Error if the
 * R2 PUT itself rejects.
 */
export async function uploadToR2(
  file: File,
  assetType?: SignUploadBodyDtoAssetType
): Promise<string> {
  const { key } = await signAndPut(file, assetType)
  return key
}

/**
 * Same as {@link uploadToR2} but translates any thrown error into a readable
 * string for surfacing in the UI without `try/catch`.
 */
export async function uploadToR2WithMessage(
  file: File,
  fallback: string,
  assetType?: SignUploadBodyDtoAssetType
): Promise<{ key?: string; error?: string }> {
  try {
    const key = await uploadToR2(file, assetType)
    return { key }
  } catch (err) {
    return { error: extractApiErrorMessage(err, fallback) }
  }
}

// ─── key + assetId variants ───────────────────────────────────────────────

/**
 * Upload and return both the R2 `key` and the backend `assetId`.
 *
 * Use when the downstream API expects an `assetIds[]` list
 * (e.g. `POST /tasks` with `CreateTaskInput.assetIds`).
 */
export async function uploadAssetToR2(
  file: File,
  assetType?: SignUploadBodyDtoAssetType
): Promise<UploadedAsset | { error: string }> {
  try {
    return await signAndPut(file, assetType)
  } catch (err) {
    return { error: extractApiErrorMessage(err, 'Upload failed') }
  }
}