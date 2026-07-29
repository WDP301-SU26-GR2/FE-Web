import { StudioOverviewPage, mangakaRouteMeta } from '~/features/mangaka'

export function meta() {
  return mangakaRouteMeta('routeMeta.studioOverview.title', 'routeMeta.studioOverview.description')
}

export default function MangakaStudioOverviewRoute() {
  return <StudioOverviewPage />
}
