import { MyStudioPage } from '~/features/mangaka'
import type { Route } from './+types/my-studio'

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Studio - MangakaStudio Pro' },
    { name: 'description', content: 'Quản lý quan hệ thuê trợ lý cho series của bạn' }
  ]
}

export default function DashboardMyStudioRoute() {
  return <MyStudioPage />
}