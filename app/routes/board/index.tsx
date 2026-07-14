import { useTranslation } from 'react-i18next'

export function meta() {
  return [{ title: 'Board Dashboard - MangaStudio Pro' }]
}

export default function DashboardBoardRoute() {
  const { t } = useTranslation('common')
  return (
    <div className='p-8 text-center text-muted-foreground'>
      <h2 className='text-2xl font-bold text-foreground'>{t('dashboard.board')}</h2>
      <p className='mt-2'>{t('dashboard.comingSoonBoard')}</p>
    </div>
  )
}
