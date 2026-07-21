import { MangakaDashboard } from '~/features/mangaka'
import { SITE } from '~/shared/config/site'
import type { Route } from './+types/index'

export function meta({}: Route.MetaArgs) {
  return [
    { title: `Mangaka Dashboard - ${SITE.name}` },
    { name: 'description', content: 'Bảng điều khiển sản xuất manga' }
  ]
}

export default function DashboardMangakaRoute() {
  return <MangakaDashboard />
}
