import { Calendar, CalendarClock, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useMangakaOutgoingInviteDetail } from './use-mangaka-outgoing-invite-detail'

interface OutgoingInviteDetailProps {
  inviteId: string
}

function formatDateTime(value: string, locale: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatDate(value: string | null, locale: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function OutgoingInviteDetail({ inviteId }: OutgoingInviteDetailProps) {
  const { t, i18n } = useTranslation('mangaka')
  const { invite, isLoading, error, retry } = useMangakaOutgoingInviteDetail(inviteId)

  if (isLoading) {
    return (
      <div className='flex items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground' role='status'>
        <Loader2 className='h-3.5 w-3.5 animate-spin' />
        {t('outgoingInvites.detail.loading')}
      </div>
    )
  }

  if (error || !invite) {
    return (
      <div
        className='flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-destructive'
        role='alert'
      >
        <span>{error ?? t('outgoingInvites.detail.unavailable')}</span>
        <button type='button' onClick={retry} className='font-semibold underline cursor-pointer'>
          {t('outgoingInvites.actions.retry')}
        </button>
      </div>
    )
  }

  return (
    <div className='grid gap-3 border-t border-border pt-3 sm:grid-cols-2'>
      <div>
        <p className='text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
          {t('outgoingInvites.detail.assistant')}
        </p>
        <p className='mt-1 text-xs text-foreground'>
          {invite.assistant?.displayName ?? t('outgoingInvites.card.unknownAssistant')}
        </p>
      </div>
      <div>
        <p className='text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
          {t('outgoingInvites.detail.series')}
        </p>
        <p className='mt-1 text-xs text-foreground'>{invite.series?.title ?? t('outgoingInvites.card.noSeries')}</p>
      </div>
      <div>
        <p className='text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
          {t('outgoingInvites.detail.hireWindow')}
        </p>
        <p className='mt-1 inline-flex items-center gap-1.5 text-xs text-foreground'>
          <Calendar className='h-3.5 w-3.5 text-primary' />
          {t('outgoingInvites.card.hireWindow', {
            from: formatDate(invite.hireStart, i18n.language),
            to: formatDate(invite.hireEnd, i18n.language)
          })}
        </p>
      </div>
      <div>
        <p className='text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
          {t('outgoingInvites.detail.createdAt')}
        </p>
        <p className='mt-1 inline-flex items-center gap-1.5 text-xs text-foreground'>
          <CalendarClock className='h-3.5 w-3.5 text-primary' />
          {formatDateTime(invite.createdAt, i18n.language)}
        </p>
      </div>
      <div className='sm:col-span-2'>
        <p className='text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
          {t('outgoingInvites.detail.taskTypes')}
        </p>
        {invite.taskTypes.length > 0 ? (
          <div className='mt-1 flex flex-wrap gap-1.5'>
            {invite.taskTypes.map((taskType) => (
              <span
                key={taskType}
                className='rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground'
              >
                {t(`myStudio.taskType.${taskType}`)}
              </span>
            ))}
          </div>
        ) : (
          <p className='mt-1 text-xs text-muted-foreground'>{t('outgoingInvites.detail.noTaskTypes')}</p>
        )}
      </div>
    </div>
  )
}
