import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type {
  MangakaDirectoryListResDtoOutputItemsItem,
  UsersControllerListMangakasGenre,
  UsersControllerListMangakasLevel,
  UsersControllerListMangakasParams
} from '~/api/model/users'
import { usersControllerListMangakas } from '~/api/operations/users/users'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

import { buildMangakaDirectoryParams } from './mangaka-directory-query'

export const MANGAKA_DIRECTORY_PAGE_SIZE = 8

export type UseMangakaDirectoryResult = {
  items: MangakaDirectoryListResDtoOutputItemsItem[]
  total: number
  page: number
  pageSize: number
  genre: UsersControllerListMangakasGenre | undefined
  query: string | undefined
  level: UsersControllerListMangakasLevel | undefined
  isLoading: boolean
  error: string | null
  setPage: (page: number) => void
  setGenre: (genre: UsersControllerListMangakasGenre | undefined) => void
  setQuery: (query: string | undefined) => void
  setLevel: (level: UsersControllerListMangakasLevel | undefined) => void
  refresh: () => void
}

export function useMangakaDirectory(): UseMangakaDirectoryResult {
  const { t } = useTranslation('mangaka')
  const [items, setItems] = useState<MangakaDirectoryListResDtoOutputItemsItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPageState] = useState(1)
  const [genre, setGenreState] = useState<UsersControllerListMangakasGenre | undefined>()
  const [query, setQueryState] = useState<string | undefined>()
  const [level, setLevelState] = useState<UsersControllerListMangakasLevel | undefined>()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  const fetchPage = useCallback(
    async (
      targetPage: number,
      targetQuery: string | undefined,
      targetGenre: UsersControllerListMangakasGenre | undefined,
      targetLevel: UsersControllerListMangakasLevel | undefined
    ) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      const params: UsersControllerListMangakasParams = buildMangakaDirectoryParams({
        page: targetPage,
        pageSize: MANGAKA_DIRECTORY_PAGE_SIZE,
        query: targetQuery,
        genre: targetGenre,
        level: targetLevel
      })

      setIsLoading(true)
      setError(null)
      try {
        const response = await usersControllerListMangakas(params, { signal: controller.signal })
        if (controller.signal.aborted) return
        const lastPage = Math.max(1, Math.ceil(response.data.total / MANGAKA_DIRECTORY_PAGE_SIZE))
        if (targetPage > lastPage) {
          setPageState(lastPage)
          return
        }
        setItems(response.data.items)
        setTotal(response.data.total)
      } catch (cause: unknown) {
        if (controller.signal.aborted || (cause instanceof Error && cause.name === 'AbortError')) return
        setItems([])
        setTotal(0)
        setError(extractApiErrorMessage(cause, t('mangakaDirectory.errors.loadFailed')))
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    },
    [t]
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchPage(page, query, genre, level)
    return () => abortRef.current?.abort()
  }, [fetchPage, genre, level, page, query, reloadToken])

  const setPage = useCallback((nextPage: number) => setPageState(Math.max(1, nextPage)), [])
  const setGenre = useCallback((nextGenre: UsersControllerListMangakasGenre | undefined) => {
    setPageState(1)
    setGenreState(nextGenre)
  }, [])
  const setQuery = useCallback((nextQuery: string | undefined) => {
    setPageState(1)
    setQueryState(nextQuery)
  }, [])
  const setLevel = useCallback((nextLevel: UsersControllerListMangakasLevel | undefined) => {
    setPageState(1)
    setLevelState(nextLevel)
  }, [])
  const refresh = useCallback(() => setReloadToken((value) => value + 1), [])

  return {
    items,
    total,
    page,
    pageSize: MANGAKA_DIRECTORY_PAGE_SIZE,
    genre,
    query,
    level,
    isLoading,
    error,
    setPage,
    setGenre,
    setQuery,
    setLevel,
    refresh
  }
}
