/**
 * Re-export from shared hooks for backward compatibility.
 * Use this for Mangaka-specific task file signing.
 * For Assistant, prefer importing directly from '~/shared/hooks'.
 */
export { useTaskSignedUrl } from '~/shared/hooks/use-task-signed-url'
export type { TaskSignedUrlState } from '~/shared/hooks/use-task-signed-url'
