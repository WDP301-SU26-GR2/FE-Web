const DEADLINE_DATE_LOCALE = 'vi-VN'

export function formatDeadlineDate(value: string | null | undefined): string {
  if (!value) return '—'

  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString(DEADLINE_DATE_LOCALE, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
}
