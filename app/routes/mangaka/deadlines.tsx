import { MangakaDeadlinesPage, mangakaRouteMeta } from '~/features/mangaka'

export function meta() {
  return mangakaRouteMeta('routeMeta.deadlines.title', 'routeMeta.deadlines.description')
}

export default function MangakaDeadlinesRoute() {
  return <MangakaDeadlinesPage />
}
