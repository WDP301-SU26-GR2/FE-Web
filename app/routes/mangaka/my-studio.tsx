import { MyStudioPage, mangakaRouteMeta } from '~/features/mangaka'
import type { Route } from './+types/my-studio'

export function meta({}: Route.MetaArgs) {
  return mangakaRouteMeta('routeMeta.myStudio.title', 'routeMeta.myStudio.description')
}

export default function DashboardMyStudioRoute() {
  return <MyStudioPage />
}
