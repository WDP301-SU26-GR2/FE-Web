/**
 * Canonical list of audit action values used for `datalist` suggestions in the
 * Audit log page. The FE renders these via i18n; missing keys fallback to
 * `audit.actions.unknown` so the UI never shows raw enum values to users.
 *
 * When BE adds a new action value, add it to this array AND to both
 * `vi/admin.json` and `en/admin.json` under `audit.actions`.
 *
 * Note: some action values in the DB (e.g. `STATUS_CHANGED`, `APPROVE`, `REJECT`)
 * are not in this list because the frontend historically used them without
 * datalist suggestions. They are still covered by the locale lookup.
 */
export const KNOWN_AUDIT_ACTIONS = [
  'TRANSITION',
  'CREATE',
  'UPDATE',
  'DELETE',
  'SOFT_DELETE',
  'RESTORE',
  'RESET_PASSWORD',
  'BAN',
  'BLOCK',
  'REACTIVATE',
  'CONFIG_UPDATE',
  'HOLD',
  'RESUME',
  'CLAIM',
  'RELEASE',
  'SESSION_TRANSITION',
  'PHASE_ADVANCED',
  'DECISION_FINALIZED',
  'RANKING_FINALIZED',
  'PRODUCTION_STAGE_COMPLETE',
  'PRODUCTION_STAGE_REOPEN'
] as const

export type KnownAuditAction = (typeof KNOWN_AUDIT_ACTIONS)[number]

/** Returns true if the action value is in KNOWN_AUDIT_ACTIONS. */
export function isKnownAuditAction(value: string): value is KnownAuditAction {
  return (KNOWN_AUDIT_ACTIONS as readonly string[]).includes(value)
}

/**
 * Validates an audit action value.
 * In development, logs a warning if the action is not in KNOWN_AUDIT_ACTIONS.
 * This helps catch missing i18n keys before they reach production.
 */
export function validateAuditAction(value: string): void {
  if (process.env.NODE_ENV === 'development' && !isKnownAuditAction(value)) {
    console.warn(
      `[admin-audit] Unknown audit action: "${value}". ` +
        `Add it to KNOWN_AUDIT_ACTIONS in "shared/lib/audit-action.ts" ` +
        `and add the translation key "audit.actions.${value}" to both locale files.`
    )
  }
}
