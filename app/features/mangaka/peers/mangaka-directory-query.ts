export type MangakaDirectoryFilters<Genre extends string> = {
  page: number
  pageSize: number
  query?: string
  genre?: Genre
  level?: string
}

export type MangakaDirectoryParams<Genre extends string> = {
  limit: number
  offset: number
  q?: string
  genre?: Genre
  level?: string
}

export function buildMangakaDirectoryParams<Genre extends string>({
  page,
  pageSize,
  query,
  genre,
  level
}: MangakaDirectoryFilters<Genre>): MangakaDirectoryParams<Genre> {
  const normalizedPage = Math.max(1, Math.trunc(page))
  const normalizedQuery = query?.trim()
  const normalizedLevel = level?.trim()

  return {
    limit: pageSize,
    offset: (normalizedPage - 1) * pageSize,
    ...(normalizedQuery ? { q: normalizedQuery } : {}),
    ...(genre ? { genre } : {}),
    ...(normalizedLevel ? { level: normalizedLevel } : {})
  }
}
