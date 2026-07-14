import { MySeriesPage } from '~/features/mangaka'
import type { Route } from './+types/series'

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'My Series - MangakaStudio Pro' },
    { name: 'description', content: 'Quản lý series truyện của bạn' }
  ]
}

export default function DashboardSeriesRoute() {
  return <MySeriesPage />
}