const PUBLIC_SERIES_PAGE_SIZE = 50

interface PublicSeriesCatalogPage<T> {
  data: {
    items: T[]
    total: number
  }
}

type PublicSeriesPageLoader<T> = (params: { limit: number; offset: number }) => Promise<PublicSeriesCatalogPage<T>>

export async function loadPublicSeriesCatalog<T>(loadPage: PublicSeriesPageLoader<T>): Promise<T[]> {
  const firstPage = await loadPage({ limit: PUBLIC_SERIES_PAGE_SIZE, offset: 0 })
  const remainingOffsets = Array.from(
    { length: Math.max(0, Math.ceil(firstPage.data.total / PUBLIC_SERIES_PAGE_SIZE) - 1) },
    (_, index) => (index + 1) * PUBLIC_SERIES_PAGE_SIZE
  )
  const remainingPages = await Promise.all(
    remainingOffsets.map((offset) => loadPage({ limit: PUBLIC_SERIES_PAGE_SIZE, offset }))
  )

  return [...firstPage.data.items, ...remainingPages.flatMap((page) => page.data.items)]
}
