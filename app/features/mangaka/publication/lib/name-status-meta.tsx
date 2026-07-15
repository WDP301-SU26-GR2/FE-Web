import { cn } from '~/shared/lib/cn'

export type NameStatusKey =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'REVISION'
  | 'APPROVED'

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
    className: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
    i18nKey: 'SUBMITTED'
  },
  IN_REVIEW: {
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    i18nKey: 'IN_REVIEW'
  },
  REVISION: {
    className: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    i18nKey: 'REVISION'
  },
  APPROVED: {
    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    i18nKey: 'APPROVED'
  }
}

const PAGE_STATUS_META: Record<string, StatusMeta> = {
  NOT_STARTED: {
    className: 'bg-muted text-muted-foreground border-border',
    i18nKey: 'NOT_STARTED'
  },
  IN_PROGRESS: {
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    i18nKey: 'IN_PROGRESS'
  },
  COMPOSITE_READY: {
    className: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
    i18nKey: 'COMPOSITE_READY'
  },
  COMPLETED: {
    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    i18nKey: 'COMPLETED'
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
  return (
    (NAME_STATUS_META as Record<string, StatusMeta>)[status] ?? NAME_STATUS_META.DRAFT
  ).className
}

export function PageStatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = (PAGE_STATUS_META as Record<string, StatusMeta>)[status] ?? PAGE_STATUS_META.NOT_STARTED
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
  return (
    (PAGE_STATUS_META as Record<string, StatusMeta>)[status] ?? PAGE_STATUS_META.NOT_STARTED
  ).className
}

export const NAME_STATUS_KEYS = Object.keys(NAME_STATUS_META) as NameStatusKey[]
/**
 * Statuses in which the Mangaka may still edit the page list of a Name.
 *
 * Per FE-API-Guide §10.5:
 *   - `POST /chapters/:id/names` tạo xong sẽ có status `SUBMITTED` (chờ Editor
 *     vào review). Trước khi Editor claim, Mangaka vẫn có quyền sửa pages
 *     (tránh race-condition khi upload nhầm ngay lúc submit).
 *   - `IN_REVIEW` = Editor đang xem → Khoá lại (sửa sẽ làm rối Editor).
 *   - `REVISION` = Editor yêu cầu sửa → Mangaka phải sửa được.
 *   - `APPROVED` = Editor duyệt rồi → Đóng gate upload page (production).
 *
 * `DRAFT` giữ cho chắc (phòng khi BE đặt khác SUBMITTED sau refactor).
 */
export const NAME_EDITABLE_STATUSES: ReadonlyArray<NameStatusKey> = ['DRAFT', 'SUBMITTED', 'REVISION']
