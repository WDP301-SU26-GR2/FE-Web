export type MangakaDirectoryFilters<Genre extends string, Level extends string> = {
  page: number
  pageSize: number
  query?: string
  genre?: Genre
  level?: Level
}

export type MangakaDirectoryParams<Genre extends string, Level extends string> = {
  limit: number
  offset: number
  q?: string
  genre?: Genre
  level?: Level
}

export function buildMangakaDirectoryParams<Genre extends string, Level extends string>({
  page,
  pageSize,
  query,
  genre,
  level
}: MangakaDirectoryFilters<Genre, Level>): MangakaDirectoryParams<Genre, Level> {
  const normalizedPage = Math.max(1, Math.trunc(page))
  const normalizedQuery = query?.trim()

  return {
    limit: pageSize,
    offset: (normalizedPage - 1) * pageSize,
    ...(normalizedQuery ? { q: normalizedQuery } : {}),
    ...(genre ? { genre } : {}),
    ...(level ? { level } : {})
  }
}
