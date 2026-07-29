import { MangakaRankingsPage, mangakaRouteMeta } from '~/features/mangaka'

export function meta() {
  return mangakaRouteMeta('routeMeta.rankings.title', 'routeMeta.rankings.description')
}

export default function MangakaRankingsRoute() {
  return <MangakaRankingsPage />
}
