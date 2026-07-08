import { useTranslation } from 'react-i18next'

export function meta() {
  return [{ title: 'Assistant Dashboard - MangaStudio Pro' }]
}

export default function DashboardAssistantRoute() {
  const { t } = useTranslation('common')
  return (
    <div className='p-8 text-center text-muted-foreground'>
      <h2 className='text-2xl font-bold text-foreground'>{t('dashboard.assistant')}</h2>
      <p className='mt-2'>{t('dashboard.comingSoonAssistant')}</p>
    </div>
  )
}
