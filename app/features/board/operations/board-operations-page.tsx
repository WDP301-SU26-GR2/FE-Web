import {
  CalendarClock,
  ChartNoAxesCombined,
  ChevronRight,
  RefreshCcw,
  Scale,
  Wrench
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { BoardHeader } from '../components/board-ui'

const operationItems = [
  ['deadlines', CalendarClock],
  ['rankings', ChartNoAxesCombined],
  ['reprints', RefreshCcw],
  ['transfers', Scale]
] as const

export function BoardOperationsPage() {
  const { t } = useTranslation('board')

  return (
    <div className='space-y-7 pb-12'>
      <BoardHeader
        title={t('operations.title')}
        description={t('operations.description')}
        backHref='/dashboard/board'
      />

      <section aria-labelledby='board-operation-list'>
        <h2 id='board-operation-list' className='sr-only'>
          {t('operations.listLabel')}
        </h2>
        <div className='grid gap-4 md:grid-cols-2'>
          {operationItems.map(([key, Icon]) => (
            <Link
              key={key}
              to={`/dashboard/board/${key}`}
              className='group min-w-0 rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            >
              <Icon className='size-6 text-primary' aria-hidden='true' />
              <h3 className='mt-4 text-pretty font-bold leading-6 text-foreground'>{t(`nav.${key}`)}</h3>
              <p className='mt-2 text-pretty text-xs leading-6 text-muted-foreground'>
                {t(`dashboard.sections.${key}`)}
              </p>
              <span className='mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary'>
                {t('operations.open')}
                <ChevronRight className='size-4 transition-transform group-hover:translate-x-1' aria-hidden='true' />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <p className='flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-4 text-xs leading-6 text-muted-foreground'>
        <Wrench className='mt-0.5 size-4 shrink-0 text-primary' aria-hidden='true' />
        <span>{t('operations.hint')}</span>
      </p>
    </div>
  )
}
