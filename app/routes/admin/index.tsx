import { useTranslation } from 'react-i18next'

export function meta() {
  return [{ title: 'Admin Dashboard - MangaStudio Pro' }]
}

export default function DashboardAdminRoute() {
  const { t } = useTranslation('common')
  return (
    <div className='p-8 text-center text-muted-foreground'>
      <h2 className='text-2xl font-bold text-foreground'>{t('dashboard.admin')}</h2>
      <p className='mt-2'>{t('dashboard.comingSoonAdmin')}</p>
    </div>
  )
}
