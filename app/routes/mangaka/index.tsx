import { MangakaDashboard } from '~/features/mangaka'
import type { Route } from './+types/index'

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Mangaka Dashboard - MangakaStudio Pro' },
    { name: 'description', content: 'Bảng điều khiển sản xuất manga' }
  ]
}

export default function DashboardMangakaRoute() {
  return <MangakaDashboard />
}