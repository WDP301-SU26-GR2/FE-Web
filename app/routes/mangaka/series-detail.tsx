import { MySeriesDetailPage } from '~/features/mangaka'
import type { Route } from './+types/series-detail'

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: 'Series Detail - MangakaStudio Pro' },
    {
      name: 'description',
      content: `Chi tiết series ${params.id}`
    }
  ]
}

export default function DashboardSeriesDetailRoute({ params }: Route.ComponentProps) {
  return <MySeriesDetailPage seriesId={params.id} />
}