import { cn } from '~/shared/lib/cn'

export type NameStatusKey = 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'REVISION' | 'APPROVED'

export type PageStatusKey = 'DRAFT' | 'COMPLETED' | 'REVISING'

type StatusMeta = {
  className: string
  /** i18n key under `publication.nameStatus.<key>`. */
  i18nKey: string
}

const NAME_STATUS_META: Record<NameStatusKey, StatusMeta> = {
  DRAFT: {
    className: 'bg-muted text-muted-foreground border-border',
    i18nKey: 'DRAFT'
  },
  SUBMITTED: {
    className: 'bg-info/10 text-info border-info/20',
    i18nKey: 'SUBMITTED'
  },
  IN_REVIEW: {
    className: 'bg-warning/10 text-warning border-warning/20',
    i18nKey: 'IN_REVIEW'
  },
  REVISION: {
    className: 'bg-warning/10 text-warning border-warning/20',
    i18nKey: 'REVISION'
  },
  APPROVED: {
    className: 'bg-success/10 text-success border-success/20',
    i18nKey: 'APPROVED'
  }
}

/**
 * Page status (per FE-API-Guide-v3 §5):
 *   - DRAFT — Mangaka đang vẽ / giao cho Assistant. Sửa được.
 *   - COMPLETED — Đã nộp, đang ở tay Editor. KHÔNG sửa được.
 *   - REVISING — Editor (hoặc co-owner) yêu cầu sửa. Mở khoá sửa lại.
 *
 * NOTE: Ở spec v3, page KHÔNG còn state machine riêng cho Mangaka tự chuyển —
 * BE tự quản lý khi Editor duyệt/revision. FE chỉ render badge.
 */
const PAGE_STATUS_META: Record<PageStatusKey, StatusMeta> = {
  DRAFT: {
    className: 'bg-muted text-muted-foreground border-border',
    i18nKey: 'DRAFT'
  },
  COMPLETED: {
    className: 'bg-success/10 text-success border-success/20',
    i18nKey: 'COMPLETED'
  },
  REVISING: {
    className: 'bg-warning/10 text-warning border-warning/20',
    i18nKey: 'REVISING'
  }
}

/**
 * Renders the small status badge for a Name. Falls back to a muted generic
 * badge when the supplied status isn't part of the known enum (defensive —
 * we receive string unions from the API and let TS keep this loose).
 */
export function NameStatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = (NAME_STATUS_META as Record<string, StatusMeta>)[status] ?? NAME_STATUS_META.DRAFT
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
        meta.className,
        className
      )}
    >
      {status}
    </span>
  )
}

/** Class-name only variant — useful when caller wants to render their own label. */
export function nameStatusClassName(status: string): string {
  return ((NAME_STATUS_META as Record<string, StatusMeta>)[status] ?? NAME_STATUS_META.DRAFT).className
}

export function PageStatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = (PAGE_STATUS_META as Record<string, StatusMeta>)[status] ?? PAGE_STATUS_META.DRAFT
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
        meta.className,
        className
      )}
    >
      {status}
    </span>
  )
}

export function pageStatusClassName(status: string): string {
  return ((PAGE_STATUS_META as Record<string, StatusMeta>)[status] ?? PAGE_STATUS_META.DRAFT).className
}

export const PAGE_STATUS_KEYS = Object.keys(PAGE_STATUS_META) as PageStatusKey[]

export const NAME_STATUS_KEYS = Object.keys(NAME_STATUS_META) as NameStatusKey[]
/**
 * Statuses in which the Mangaka may still edit the page list of a Name.
 *
 * Per FE-API-Guide-v3 §5 + Spec 14 Option A:
 *   - `POST /chapters/:id/names` creates a `DRAFT`; only DRAFT pages are
 *     editable before the explicit `/submit` transition.
 *   - `SUBMITTED` / `IN_REVIEW` = Editor scope, so page mutations are locked.
 *   - `REVISION` = Editor yêu cầu sửa → Mangaka phải sửa được.
 *   - `APPROVED` = Editor duyệt rồi → Đóng gate upload page (production).
 *
 */
export const NAME_EDITABLE_STATUSES: ReadonlyArray<NameStatusKey> = ['DRAFT', 'REVISION']
