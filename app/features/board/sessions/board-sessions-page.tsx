import { Link } from 'react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { BoardMeetingSession } from '~/api/manual/board-meeting'
import { BoardSessionResDtoOutputPhase, BoardSessionResDtoOutputStatus } from '~/api/model/board'
import { boardInput, BoardHeader, EmptyState, StatusBadge } from '../components/board-ui'
import { Pagination } from '~/shared/components'

const BOARD_LIST_PAGE_SIZE = 8

export function BoardSessionsPage({ sessions, hasError }: { sessions: BoardMeetingSession[]; hasError: boolean }) {
  const { t, i18n } = useTranslation('board')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [phase, setPhase] = useState('')
  const [page, setPage] = useState(1)
  const filteredSessions = sessions
    .filter(
      (session) =>
        (!search || `${session.title} ${session.description ?? ''}`.toLowerCase().includes(search.toLowerCase())) &&
        (!status || session.status === status) &&
        (!phase || session.phase === phase)
    )
    .sort((left, right) => {
      // Phiên đang họp (ACTIVE) luôn ưu tiên lên đầu.
      if (left.status === 'ACTIVE' && right.status !== 'ACTIVE') return -1
      if (right.status === 'ACTIVE' && left.status !== 'ACTIVE') return 1
      // Còn lại — xếp trình tự mới → cũ theo createdAt.
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    })
  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / BOARD_LIST_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const from = filteredSessions.length === 0 ? 0 : (currentPage - 1) * BOARD_LIST_PAGE_SIZE + 1
  const to = Math.min(currentPage * BOARD_LIST_PAGE_SIZE, filteredSessions.length)
  const paginatedSessions = filteredSessions.slice(from > 0 ? from - 1 : 0, to)

  return (
    <div className='space-y-6 pb-12'>
      <BoardHeader title={t('sessions.title')} description={t('sessions.description')} backHref='/dashboard/board' />
      {hasError && <p className='text-xs text-destructive'>{t('common.loadError')}</p>}
      <div className='grid gap-2 rounded-xl border border-border bg-card p-4 md:grid-cols-3'>
        <input
          className={boardInput}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          placeholder={t('filters.searchSessions')}
        />
        <select
          className={boardInput}
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            setPage(1)
          }}
        >
          <option value=''>{t('filters.allSessionStatuses')}</option>
          {Object.values(BoardSessionResDtoOutputStatus).map((value) => (
            <option key={value} value={value}>
              {t(`filters.sessionStatuses.${value}`)}
            </option>
          ))}
        </select>
        <select
          className={boardInput}
          value={phase}
          onChange={(event) => {
            setPhase(event.target.value)
            setPage(1)
          }}
        >
          <option value=''>{t('filters.allPhases')}</option>
          {Object.values(BoardSessionResDtoOutputPhase).map((value) => (
            <option key={value} value={value}>
              {t(`filters.sessionPhases.${value}`)}
            </option>
          ))}
        </select>
      </div>
      <div className='grid gap-4 md:grid-cols-2'>
        {paginatedSessions.map((session) => (
          <Link
            key={session.id}
            to={`/dashboard/board/sessions/${session.id}`}
            className='rounded-xl border border-border bg-card p-5 shadow-sm hover:border-primary'
          >
            <div className='flex items-start justify-between gap-3'>
              <h2 className='font-bold text-foreground'>{session.title}</h2>
              <StatusBadge value={session.status} />
            </div>
            <p className='mt-2 text-xs text-muted-foreground'>{session.description || t('common.noDescription')}</p>
            <p className='mt-4 text-xs text-muted-foreground'>
              {new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(
                new Date(session.startTime)
              )}
            </p>
          </Link>
        ))}
      </div>
      {filteredSessions.length > 0 && (
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          setPage={setPage}
          from={from}
          to={to}
          total={filteredSessions.length}
          tKeyPrefix='pagination'
          t={t}
        />
      )}
      {!filteredSessions.length && <EmptyState text={t('sessions.empty')} />}
    </div>
  )
}
