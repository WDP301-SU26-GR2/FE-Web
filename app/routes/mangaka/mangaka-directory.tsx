import { MangakaDirectoryPage, mangakaRouteMeta } from '~/features/mangaka'

export function meta() {
  return mangakaRouteMeta('mangakaDirectory.meta.title', 'mangakaDirectory.meta.description')
}

export default function MangakaDirectoryRoute() {
  return <MangakaDirectoryPage />
}
