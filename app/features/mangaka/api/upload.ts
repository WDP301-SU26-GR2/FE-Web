import { storageControllerSignUpload } from '~/api/operations/uploads/uploads'
import type { SignUploadBodyDtoAssetType, SignUploadResDtoOutput } from '~/api/model/uploads'
import { extractApiErrorMessage } from '~/features/auth/lib/extract-api-error'

/**
 * Upload a single File to R2 via the presigned PUT flow (§5 of FE-API-Guide-v2.md).
 *
 * Flow:
 *   1. POST /uploads/sign → { uploadUrl, key, requiredHeaders, ... }
 *   2. PUT file to uploadUrl with requiredHeaders
 *   3. Return the persisted R2 `key` to be stored in DB via subsequent API calls.
 *
 * Throws the original `FetchError` from step 1 if signing fails, and a plain
 * Error if the R2 PUT itself rejects (e.g. CORS, 403, network).
 */
export async function uploadToR2(file: File, assetType?: SignUploadBodyDtoAssetType): Promise<string> {
  // Step 1: ask BE for a presigned URL.
  // customFetch throws on non-2xx, so the success branch is the only one we
  // see at runtime; cast through unknown to keep the call site tight.
  const response = await storageControllerSignUpload({
    fileName: file.name,
    contentType: file.type as 'image/png' | 'image/jpeg' | 'image/webp' | 'application/pdf',
    contentLength: file.size,
    ...(assetType ? { assetType } : {})
  })
  const signData = response.data as SignUploadResDtoOutput

  // Step 2: PUT bytes straight to R2.
  const putRes = await fetch(signData.uploadUrl, {
    method: 'PUT',
    headers: signData.requiredHeaders,
    body: file
  })
  if (!putRes.ok) {
    throw new Error(`Upload to R2 failed: ${putRes.status} ${putRes.statusText}`)
  }

  return signData.key
}

/**
 * Same as {@link uploadToR2} but translates any thrown error into a readable
 * string for surfacing in the UI.
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
