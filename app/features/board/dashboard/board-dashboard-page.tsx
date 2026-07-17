import {
  BadgeDollarSign,
  Bell,
  CalendarClock,
  ChartNoAxesCombined,
  ClipboardCheck,
  FileSignature,
  FileText,
  History,
  RefreshCcw,
  Scale,
  UserRoundCog,
  UsersRound
} from 'lucide-react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { BoardHeader } from '../components/board-ui'

const sections = [
  ['sessions', UsersRound],
  ['decisions', ClipboardCheck],
  ['reports', FileText],
  ['contracts', FileSignature],
  ['payments', BadgeDollarSign],
  ['deadlines', CalendarClock],
  ['rankings', ChartNoAxesCombined],
  ['reprints', RefreshCcw],
  ['transfers', Scale],
  ['audit', History],
  ['notifications', Bell],
  ['profile', UserRoundCog]
] as const

export function BoardDashboardPage() {
  const { t } = useTranslation('board')
  return (
    <div className='space-y-7 pb-12'>
      <BoardHeader title={t('dashboard.title')} description={t('dashboard.description')} />
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
        {sections.map(([key, Icon]) => (
          <Link
            key={key}
            to={`/dashboard/board/${key}`}
            className='rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary'
          >
            <Icon className='size-6 text-primary' />
            <h2 className='mt-4 font-bold text-foreground'>{t(`nav.${key}`)}</h2>
            <p className='mt-2 text-sm text-muted-foreground'>{t(`dashboard.sections.${key}`)}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
