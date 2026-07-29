import { MySeriesPage, mangakaRouteMeta } from '~/features/mangaka'
import type { Route } from './+types/series'

export function meta({}: Route.MetaArgs) {
  return mangakaRouteMeta('routeMeta.series.title', 'routeMeta.series.description')
}

export default function DashboardSeriesRoute() {
  return <MySeriesPage />
}
