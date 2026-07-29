import { MySeriesDetailPage, mangakaRouteMeta } from '~/features/mangaka'
import type { Route } from './+types/series-detail'

export function meta({}: Route.MetaArgs) {
  return mangakaRouteMeta('routeMeta.seriesDetail.title', 'routeMeta.seriesDetail.description')
}

export default function DashboardSeriesDetailRoute({ params }: Route.ComponentProps) {
  return <MySeriesDetailPage seriesId={params.id} />
}
