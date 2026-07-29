import { MangakaDashboard, mangakaRouteMeta } from '~/features/mangaka'
import type { Route } from './+types/index'

export function meta({}: Route.MetaArgs) {
  return mangakaRouteMeta('routeMeta.dashboard.title', 'routeMeta.dashboard.description')
}

export default function DashboardMangakaRoute() {
  return <MangakaDashboard />
}
