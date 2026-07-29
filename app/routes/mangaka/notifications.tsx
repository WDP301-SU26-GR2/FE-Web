import { MangakaNotificationsPage, mangakaRouteMeta } from '~/features/mangaka'

export function meta() {
  return mangakaRouteMeta('routeMeta.notifications.title', 'routeMeta.notifications.description')
}

export default function MangakaNotificationsRoute() {
  return <MangakaNotificationsPage />
}
