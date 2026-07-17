import { useTranslation } from 'react-i18next'

import { cn } from '~/shared/lib/cn'
import { usePublicationContext } from '../publication-shell-context'
import { NameStatusBadge } from '../lib/name-status-meta'

/**
 * Compact pill showing the *current* Name review status next to the workspace
 * title. Helps the user know why the "Pages" tab is still disabled without
 * having to navigate back to the Name view.
 *
 * The pill is hidden when the chapter has no Name yet (storyboard not started).
 */
export function PublicationStatusPill() {
  const { t } = useTranslation('mangaka')
  const { name } = usePublicationContext()

  if (!name) return null

  return (
    <div className='hidden items-center gap-2 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs sm:flex'>
      <span className='text-[10px] uppercase tracking-widest text-muted-foreground'>
        {t('publication.statusPill.label')}
      </span>
      <NameStatusBadge status={name.status} />
      <span className={cn('text-[10px] font-semibold text-muted-foreground')}>
        v{name.version}
      </span>
    </div>
  )
}
