export type OffsetPage<T> = {
  items: T[]
  total: number
}

/**
 * Loads an entire offset-paginated collection without silently truncating
 * admin/editor lookup controls at the API's maximum page size.
 */
export async function loadAllOffsetItems<T>(
  loadPage: (pagination: { limit: number; offset: number }) => Promise<OffsetPage<T>>,
  pageSize = 100
) {
  const items: T[] = []
  let offset = 0

  while (true) {
    const page = await loadPage({ limit: pageSize, offset })
    items.push(...page.items)
    offset += page.items.length
    if (page.items.length === 0 || offset >= page.total) return items
  }
}
