import { Form, Link, useFetcher } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useEffect, useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  BookOpen,
  GraduationCap,
  Library,
  Link2,
  Search,
  Star,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  FileText,
  BarChart3,
  CalendarDays,
  ShoppingBag,
  Award,
  X,
  Mail,
  Phone,
  Briefcase,
  type LucideIcon
} from 'lucide-react'
import type { DefenseDashboardResDtoOutput } from '~/api/model/tankobon'
import type { SeriesResDtoOutput } from '~/api/model/series'
import type { AssistantProfileResDtoOutput, MangakaProfileResDtoOutput } from '~/api/model/users'
import { usersControllerGetAssistantProfile, usersControllerGetMangakaProfile } from '~/api/operations/users/users'
import { getSeriesStatusTranslationKey } from './admin-reference-display'

import { Dialog } from '~/shared/ui/dialog'

type SelectItem = { id: string; title?: string; issueNumber?: string | number | null; status?: string }

const inputClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground outline-none focus:border-primary'
const modalButtonClass =
  'inline-flex h-10 w-full items-center justify-center rounded-md px-4 text-xs font-bold sm:w-auto'
export function AdminReferencePage({ selected }: { selected: Record<string, string> }) {
  const { t } = useTranslation('admin')
  const returnTo = selected.returnTo || '/dashboard/admin/operations'
  return (
    <div className='space-y-5 pb-12'>
      <header className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
        <div className='min-w-0'>
          <Link to={returnTo} className='mb-3 inline-flex items-center gap-2 text-xs font-bold text-primary'>
            <ArrowLeft className='size-4' />
            {t('operations.reference.backPrevious')}
          </Link>
          <p className='text-xs font-bold uppercase tracking-[0.18em] text-primary'>{t('operations.eyebrow')}</p>
          <h1 className='mt-1 text-2xl font-bold text-foreground'>{t('operations.reference.title')}</h1>
        </div>
      </header>

      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <p className='max-w-2xl text-sm leading-6 text-muted-foreground'>{t('operations.reference.description')}</p>
      </div>

      <LookupPageDirectory returnTo={returnTo} />
    </div>
  )
}

export function AdminReferenceSeriesPage({
  series,
  selected,
  seriesData
}: {
  series: SelectItem[]
  selected: Record<string, string>
  seriesData: {
    detail: SeriesResDtoOutput | null
    defense: DefenseDashboardResDtoOutput | null
  }
}) {
  const { t } = useTranslation('admin')
  const { detail, defense } = seriesData

  return (
    <ReferenceShell
      title={t('operations.reference.series')}
      description={t('operations.reference.seriesHelp')}
      returnTo={selected.returnTo}
    >
      <Panel
        icon={BookOpen}
        title={t('operations.reference.series')}
        description={t('operations.reference.seriesHelp')}
      >
        <Form method='get' className='grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]'>
          <input type='hidden' name='returnTo' value={selected.returnTo} />
          <select className={inputClass} name='seriesId' defaultValue={selected.seriesId} required>
            <option value=''>{t('operations.reference.selectSeries')}</option>
            {series.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title ?? t('common.notAvailable')}
              </option>
            ))}
          </select>
          <LoadButton label={t('operations.reference.load')} />
        </Form>

        {defense && detail && (
          <div className='mt-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500'>
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
              <div className='rounded-2xl border border-border bg-card p-5 shadow-sm'>
                <div className='flex items-center gap-3'>
                  <div className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'>
                    <BookOpen className='size-5' />
                  </div>
                  <div>
                    <p className='text-xs font-bold text-muted-foreground'>{t('operations.reference.seriesStatus')}</p>
                    <p className='mt-0.5 font-bold text-foreground'>
                      {t(getSeriesStatusTranslationKey(detail.status), { defaultValue: t('common.notAvailable') })}
                    </p>
                  </div>
                </div>
              </div>
              <div className='rounded-2xl border border-border bg-card p-5 shadow-sm'>
                <div className='flex items-center gap-3'>
                  <div className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500'>
                    <ShoppingBag className='size-5' />
                  </div>
                  <div>
                    <p className='text-xs font-bold text-muted-foreground'>Tổng doanh số Tankobon</p>
                    <p className='mt-0.5 font-bold text-foreground'>
                      {new Intl.NumberFormat('vi-VN').format(defense.tankobon.totalUnitsSold)} bản
                    </p>
                  </div>
                </div>
              </div>
              <div className='rounded-2xl border border-border bg-card p-5 shadow-sm'>
                <div className='flex items-center gap-3'>
                  <div className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500'>
                    <FileText className='size-5' />
                  </div>
                  <div>
                    <p className='text-xs font-bold text-muted-foreground'>Số chương đã phát hành</p>
                    <p className='mt-0.5 font-bold text-foreground'>{defense.serialization.chaptersPublished} chương</p>
                  </div>
                </div>
              </div>
              <div className='rounded-2xl border border-border bg-card p-5 shadow-sm'>
                <div className='flex items-center gap-3'>
                  <div className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500'>
                    <CalendarDays className='size-5' />
                  </div>
                  <div>
                    <p className='text-xs font-bold text-muted-foreground'>Thời gian phát hành</p>
                    <p className='mt-0.5 font-bold text-foreground'>
                      {defense.serialization.serializedSince
                        ? new Date(defense.serialization.serializedSince).toLocaleDateString('vi-VN')
                        : 'Chưa có'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <section className='rounded-2xl border border-border bg-card shadow-sm overflow-hidden'>
              <header className='border-b border-border bg-muted/30 px-6 py-4'>
                <div className='flex items-center gap-2'>
                  <BarChart3 className='size-5 text-primary' />
                  <h3 className='font-bold text-foreground'>Xu hướng xếp hạng</h3>
                </div>
              </header>
              <div className='p-6'>
                {defense.rankingTrend.length > 0 ? (
                  <div className='grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'>
                    {defense.rankingTrend.map((trend, idx) => (
                      <div
                        key={trend.surveyPeriodId || idx}
                        className='relative rounded-xl border border-border p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md'
                      >
                        {trend.isAtRisk && (
                          <div className='absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm'>
                            <AlertTriangle className='size-3.5' />
                          </div>
                        )}
                        <p className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2'>
                          {new Date(trend.recordedAt).toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' })}
                        </p>
                        <div className='flex items-end justify-between'>
                          <div>
                            <div className='text-3xl font-black text-foreground'>#{trend.rankPosition ?? '-'}</div>
                            <div className='mt-1 text-[11px] font-medium text-muted-foreground'>
                              {new Intl.NumberFormat('vi-VN').format(trend.voteCount)} phiếu
                            </div>
                          </div>
                          {trend.rankChange !== null && trend.rankChange !== 0 ? (
                            <div
                              className={`flex items-center gap-1 text-xs font-bold ${trend.rankChange > 0 ? 'text-emerald-500' : 'text-destructive'}`}
                            >
                              {trend.rankChange > 0 ? (
                                <TrendingUp className='size-4' />
                              ) : (
                                <TrendingDown className='size-4' />
                              )}
                              {Math.abs(trend.rankChange)}
                            </div>
                          ) : (
                            <div className='flex items-center gap-1 text-xs font-bold text-muted-foreground'>
                              <Minus className='size-4' />0
                            </div>
                          )}
                        </div>
                        {trend.riskLevel !== 'NONE' && (
                          <div
                            className={`mt-3 inline-flex rounded-md px-2 py-1 text-[10px] font-bold ${
                              trend.riskLevel === 'SEVERE'
                                ? 'bg-destructive/10 text-destructive'
                                : trend.riskLevel === 'MEDIUM'
                                  ? 'bg-orange-500/10 text-orange-600'
                                  : 'bg-amber-500/10 text-amber-600'
                            }`}
                          >
                            Rủi ro:{' '}
                            {t(`common:businessData.values.${trend.riskLevel}`, { defaultValue: trend.riskLevel })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='flex flex-col items-center justify-center py-8 text-center'>
                    <BarChart3 className='size-10 text-muted-foreground/30 mb-3' />
                    <p className='text-sm text-muted-foreground'>Chưa có dữ liệu xếp hạng</p>
                  </div>
                )}
              </div>
            </section>

            <section className='rounded-2xl border border-border bg-card shadow-sm overflow-hidden'>
              <header className='border-b border-border bg-muted/30 px-6 py-4'>
                <div className='flex items-center gap-2'>
                  <Award className='size-5 text-primary' />
                  <h3 className='font-bold text-foreground'>Báo cáo / Quyết định Hội đồng</h3>
                </div>
              </header>
              <div className='divide-y divide-border'>
                {defense.seriesReports.length > 0 ? (
                  defense.seriesReports.map((report) => (
                    <article key={report.id} className='p-6 transition hover:bg-muted/30'>
                      <div className='flex items-center justify-between mb-3'>
                        <span className='inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary'>
                          {report.reportType
                            ? t(`board:reports.types.${report.reportType}`, { defaultValue: report.reportType })
                            : 'Báo cáo'}
                        </span>
                        <span className='text-xs text-muted-foreground'>
                          {new Date(report.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                      <p className='text-sm leading-relaxed text-foreground whitespace-pre-wrap'>{report.content}</p>
                    </article>
                  ))
                ) : (
                  <div className='p-6 text-center text-sm text-muted-foreground'>Chưa có báo cáo nào</div>
                )}
              </div>
            </section>
          </div>
        )}
      </Panel>
    </ReferenceShell>
  )
}

export function AdminReferenceDirectoriesPage({
  directories,
  selected,
  pagination,
  search,
  tab
}: {
  directories: {
    mangakas: { items: MangakaDirectoryItem[]; total: number; limit: number; offset: number }
    assistants: { items: AssistantDirectoryItem[]; total: number; limit: number; offset: number }
  }
  selected: Record<string, string>
  pagination: { page: number; limit: number; totalMangakas: number; totalAssistants: number }
  search: string
  tab: string
}) {
  const { t } = useTranslation('admin')
  const fetcher = useFetcher()
  const [activeTab, setActiveTab] = useState(tab)

  const totalMangakas = pagination.totalMangakas
  const totalAssistants = pagination.totalAssistants
  const totalPages =
    activeTab === 'mangakas'
      ? Math.ceil(totalMangakas / pagination.limit)
      : Math.ceil(totalAssistants / pagination.limit)

  return (
    <ReferenceShell
      title={t('operations.reference.directories')}
      description={t('operations.reference.directoriesHelp')}
      returnTo={selected.returnTo}
    >
      <fetcher.Form method='post' className='mb-4'>
        <input type='hidden' name='intent' value='search' />
        <input type='hidden' name='tab' value={activeTab} />
        <div className='flex gap-2'>
          <div className='relative flex-1'>
            <Search className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
            <input
              name='q'
              defaultValue={search}
              placeholder={t('operations.reference.searchPlaceholder')}
              className='h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-xs outline-none focus:border-primary'
            />
          </div>
          <button type='submit' className='h-10 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground'>
            {t('operations.reference.search')}
          </button>
        </div>
      </fetcher.Form>

      <div className='mb-4 flex gap-1 rounded-lg border border-border p-1'>
        <button
          onClick={() => setActiveTab('mangakas')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-xs font-bold transition-colors ${
            activeTab === 'mangakas' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <BookOpen className='size-4' />
          {t('operations.reference.mangakas')} ({totalMangakas})
        </button>
        <button
          onClick={() => setActiveTab('assistants')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-xs font-bold transition-colors ${
            activeTab === 'assistants' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <Users className='size-4' />
          {t('operations.reference.assistants')} ({totalAssistants})
        </button>
      </div>

      {activeTab === 'mangakas' && <MangakaDirectoryList items={directories.mangakas.items} />}
      {activeTab === 'assistants' && <AssistantDirectoryList items={directories.assistants.items} />}

      {totalPages > 1 && (
        <Pagination currentPage={pagination.page} totalPages={totalPages} tab={activeTab} search={search} />
      )}
    </ReferenceShell>
  )
}

interface MangakaDirectoryItem {
  userId: string
  displayName: string | null
  avatar: string | null
  penName: string
  genres: string[]
  experienceLevel: string | null
  bio: string | null
  reputationScore: number
  ratingAvg: number
  ratingCount: number
  isRecommended: boolean
  email: string
  phoneNumber: string | null
}

function MangakaDirectoryList({ items }: { items: MangakaDirectoryItem[] }) {
  const { t } = useTranslation('admin')
  const [selectedPerson, setSelectedPerson] = useState<DirectoryPerson | null>(null)
  if (items.length === 0) {
    return (
      <div className='rounded-lg border border-border bg-card p-8 text-center'>
        <BookOpen className='mx-auto size-10 text-muted-foreground/50' />
        <p className='mt-3 text-sm font-semibold text-muted-foreground'>{t('operations.reference.noMangakas')}</p>
      </div>
    )
  }
  return (
    <div className='space-y-3'>
      {items.map((item) => (
        <button
          type='button'
          key={item.userId}
          onClick={() =>
            setSelectedPerson({ userId: item.userId, kind: 'mangaka', name: item.displayName ?? item.penName })
          }
          className='block w-full rounded-xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
        >
          <div className='flex items-start gap-4'>
            <div className='size-12 shrink-0 overflow-hidden rounded-full bg-primary/10'>
              {item.avatar ? (
                <img src={item.avatar} alt={item.displayName ?? item.penName} className='size-full object-cover' />
              ) : (
                <div className='flex size-full items-center justify-center'>
                  <BookOpen className='size-5 text-primary' />
                </div>
              )}
            </div>
            <div className='min-w-0 flex-1'>
              <div className='flex flex-wrap items-center gap-2'>
                <h3 className='font-bold text-foreground'>{item.displayName ?? item.penName}</h3>
                {item.isRecommended && (
                  <span className='inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700'>
                    <Star className='size-3' /> {t('operations.reference.recommended')}
                  </span>
                )}
              </div>
              <p className='mt-1 text-xs text-muted-foreground'>{item.penName}</p>
              <div className='mt-2 flex flex-wrap gap-1'>
                {item.genres.slice(0, 5).map((genre) => (
                  <span
                    key={genre}
                    className='rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary'
                  >
                    {t(`operations.reference.genres.${genre}`, { defaultValue: genre })}
                  </span>
                ))}
              </div>
            </div>
            <div className='shrink-0 text-right'>
              <div className='text-lg font-bold text-foreground'>{item.reputationScore.toFixed(1)}</div>
              <div className='text-[10px] text-muted-foreground'>{t('operations.reference.reputation')}</div>
              {item.experienceLevel && (
                <span className='mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground'>
                  {t(`operations.reference.levels.${item.experienceLevel}`)}
                </span>
              )}
            </div>
          </div>
          <div className='mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground'>
            <span>
              <span className='font-medium'>{t('operations.reference.email')}:</span> {item.email}
            </span>
            {item.phoneNumber && (
              <span>
                <span className='font-medium'>{t('operations.reference.phone')}:</span> {item.phoneNumber}
              </span>
            )}
            <span>
              <span className='font-medium'>{t('operations.reference.rating')}:</span> {item.ratingAvg.toFixed(1)} (
              {item.ratingCount})
            </span>
          </div>
          <div className='mt-3 flex items-center justify-end border-t border-border pt-3 text-xs font-bold text-primary'>
            {t('operations.reference.profile.view')}
          </div>
        </button>
      ))}
      {selectedPerson && <DirectoryProfileDialog person={selectedPerson} onClose={() => setSelectedPerson(null)} />}
    </div>
  )
}

interface AssistantDirectoryItem {
  userId: string
  displayName: string | null
  avatar: string | null
  specializations: string[]
  experienceLevel: string | null
  availabilityStatus: string | null
  reputationScore: number
  ratingAvg: number
  ratingCount: number
  isRecommended: boolean
  email: string
  phoneNumber: string | null
}

function AssistantDirectoryList({ items }: { items: AssistantDirectoryItem[] }) {
  const { t } = useTranslation('admin')
  const [selectedPerson, setSelectedPerson] = useState<DirectoryPerson | null>(null)
  if (items.length === 0) {
    return (
      <div className='rounded-lg border border-border bg-card p-8 text-center'>
        <Users className='mx-auto size-10 text-muted-foreground/50' />
        <p className='mt-3 text-sm font-semibold text-muted-foreground'>{t('operations.reference.noAssistants')}</p>
      </div>
    )
  }
  return (
    <div className='space-y-3'>
      {items.map((item) => (
        <button
          type='button'
          key={item.userId}
          onClick={() =>
            setSelectedPerson({
              userId: item.userId,
              kind: 'assistant',
              name: item.displayName ?? t('operations.reference.assistants')
            })
          }
          className='block w-full rounded-xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
        >
          <div className='flex items-start gap-4'>
            <div className='size-12 shrink-0 overflow-hidden rounded-full bg-primary/10'>
              {item.avatar ? (
                <img src={item.avatar} alt={item.displayName ?? ''} className='size-full object-cover' />
              ) : (
                <div className='flex size-full items-center justify-center'>
                  <Users className='size-5 text-primary' />
                </div>
              )}
            </div>
            <div className='min-w-0 flex-1'>
              <div className='flex flex-wrap items-center gap-2'>
                <h3 className='font-bold text-foreground'>{item.displayName ?? t('common.notAvailable')}</h3>
                {item.isRecommended && (
                  <span className='inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700'>
                    <Star className='size-3' /> {t('operations.reference.recommended')}
                  </span>
                )}
                {item.availabilityStatus && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      item.availabilityStatus === 'AVAILABLE'
                        ? 'bg-emerald-100 text-emerald-700'
                        : item.availabilityStatus === 'BUSY'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {t(`operations.reference.availability.${item.availabilityStatus}`)}
                  </span>
                )}
              </div>
              <div className='mt-2 flex flex-wrap gap-1'>
                {item.specializations.map((spec) => (
                  <span key={spec} className='rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700'>
                    {t(`operations.reference.specs.${spec}`)}
                  </span>
                ))}
              </div>
            </div>
            <div className='shrink-0 text-right'>
              <div className='text-lg font-bold text-foreground'>{item.reputationScore.toFixed(1)}</div>
              <div className='text-[10px] text-muted-foreground'>{t('operations.reference.reputation')}</div>
              {item.experienceLevel && (
                <span className='mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground'>
                  <GraduationCap className='mr-1 inline size-3' />
                  {t(`operations.reference.levels.${item.experienceLevel}`)}
                </span>
              )}
            </div>
          </div>
          <div className='mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground'>
            <span>
              <span className='font-medium'>{t('operations.reference.email')}:</span> {item.email}
            </span>
            {item.phoneNumber && (
              <span>
                <span className='font-medium'>{t('operations.reference.phone')}:</span> {item.phoneNumber}
              </span>
            )}
            <span>
              <span className='font-medium'>{t('operations.reference.rating')}:</span> {item.ratingAvg.toFixed(1)} (
              {item.ratingCount})
            </span>
          </div>
          <div className='mt-3 flex items-center justify-end border-t border-border pt-3 text-xs font-bold text-primary'>
            {t('operations.reference.profile.view')}
          </div>
        </button>
      ))}
      {selectedPerson && <DirectoryProfileDialog person={selectedPerson} onClose={() => setSelectedPerson(null)} />}
    </div>
  )
}

type DirectoryPerson = { userId: string; kind: 'mangaka' | 'assistant'; name: string }
type DirectoryProfile = MangakaProfileResDtoOutput | AssistantProfileResDtoOutput

function DirectoryProfileDialog({ person, onClose }: { person: DirectoryPerson; onClose: () => void }) {
  const { t } = useTranslation('admin')
  const [profile, setProfile] = useState<DirectoryProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    let cancelled = false
    const request =
      person.kind === 'mangaka'
        ? usersControllerGetMangakaProfile({ userId: person.userId })
        : usersControllerGetAssistantProfile({ userId: person.userId })
    request
      .then((response) => {
        if (!cancelled) setProfile(response.data)
      })
      .catch(() => {
        if (!cancelled) setHasError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [person.kind, person.userId])

  return (
    <Dialog
      open
      onClose={onClose}
      titleId='directory-profile'
      title={
        person.kind === 'mangaka'
          ? t('operations.reference.profile.mangakaTitle')
          : t('operations.reference.profile.assistantTitle')
      }
      description={person.name}
      size='md'
    >
      <div className='relative'>
        <button
          type='button'
          onClick={onClose}
          aria-label={t('operations.reference.profile.close')}
          className='absolute right-0 top-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground'
        >
          <X className='size-4' />
        </button>
        {loading && <p className='py-8 text-center text-sm text-muted-foreground'>{t('common.loading')}</p>}
        {!loading && hasError && (
          <p className='py-8 text-center text-sm text-destructive'>{t('operations.reference.profile.loadError')}</p>
        )}
        {!loading && !hasError && profile && (
          <div className='space-y-5'>
            <div className='flex items-center gap-4 border-b border-border pb-4'>
              <div className='grid size-14 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-primary'>
                {profile.avatar ? (
                  <img src={profile.avatar} alt={person.name} className='size-full object-cover' />
                ) : (
                  <Users className='size-6' />
                )}
              </div>
              <div className='min-w-0'>
                <h2 className='truncate text-lg font-bold text-foreground'>{profile.displayName || person.name}</h2>
                {'penName' in profile && (
                  <p className='text-xs text-muted-foreground'>{profile.penName || t('common.notAvailable')}</p>
                )}
                <p className='mt-1 text-xs font-semibold text-primary'>
                  {t(`operations.reference.levels.${profile.experienceLevel}`, {
                    defaultValue: profile.experienceLevel || t('common.notAvailable')
                  })}
                </p>
              </div>
            </div>
            <dl className='grid gap-3 sm:grid-cols-2'>
              <ProfileField icon={Mail} label={t('operations.reference.email')} value={profile.email} />
              <ProfileField icon={Phone} label={t('operations.reference.phone')} value={profile.phoneNumber} />
              <ProfileField
                icon={Star}
                label={t('operations.reference.reputation')}
                value={`${profile.reputationScore.toFixed(1)} · ${profile.ratingAvg.toFixed(1)} (${profile.ratingCount})`}
              />
              {'availabilityStatus' in profile && (
                <ProfileField
                  icon={Briefcase}
                  label={t('operations.reference.profile.availability')}
                  value={t(`operations.reference.availability.${profile.availabilityStatus}`, {
                    defaultValue: profile.availabilityStatus || t('common.notAvailable')
                  })}
                />
              )}
            </dl>
            <section>
              <h3 className='text-xs font-bold text-foreground'>{t('operations.reference.profile.bio')}</h3>
              <p className='mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground'>
                {'bio' in profile && profile.bio ? profile.bio : t('operations.reference.profile.noBio')}
              </p>
            </section>
            <section>
              <h3 className='text-xs font-bold text-foreground'>{t('operations.reference.profile.portfolio')}</h3>
              {profile.portfolioFiles.length ? (
                <ul className='mt-2 space-y-1 text-xs text-primary'>
                  {profile.portfolioFiles.map((file) => (
                    <li key={file} className='truncate'>
                      {file}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className='mt-1 text-sm text-muted-foreground'>{t('operations.reference.profile.noPortfolio')}</p>
              )}
            </section>
          </div>
        )}
      </div>
    </Dialog>
  )
}

function ProfileField({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className='rounded-lg bg-muted/30 p-3'>
      <dt className='flex items-center gap-2 text-[11px] font-semibold text-muted-foreground'>
        <Icon className='size-3.5' />
        {label}
      </dt>
      <dd className='mt-1 break-words text-xs font-bold text-foreground'>{value || '—'}</dd>
    </div>
  )
}

function Pagination({
  currentPage,
  totalPages,
  tab,
  search
}: {
  currentPage: number
  totalPages: number
  tab: string
  search: string
}) {
  const { t } = useTranslation('admin')
  const pageUrl = (page: number) => {
    const url = new URL(window.location.href)
    url.searchParams.set('page', String(page))
    url.searchParams.set('tab', tab)
    if (search) url.searchParams.set('q', search)
    return url.pathname + url.search
  }
  return (
    <div className='mt-6 flex items-center justify-center gap-2'>
      {currentPage > 1 && (
        <a
          href={pageUrl(currentPage - 1)}
          className='flex h-8 items-center gap-1 rounded-md border border-border px-3 text-xs font-medium hover:bg-muted'
        >
          <ArrowLeft className='size-3' />
          {t('operations.reference.prev')}
        </a>
      )}
      <span className='px-3 text-xs text-muted-foreground'>
        {t('operations.reference.pageOf', { current: currentPage, total: totalPages })}
      </span>
      {currentPage < totalPages && (
        <a
          href={pageUrl(currentPage + 1)}
          className='flex h-8 items-center gap-1 rounded-md border border-border px-3 text-xs font-medium hover:bg-muted'
        >
          {t('operations.reference.next')}
          <ArrowLeft className='size-3 rotate-180' />
        </a>
      )}
    </div>
  )
}

function ReferenceShell({
  title,
  description,
  returnTo,
  children
}: {
  title: string
  description: string
  returnTo?: string
  children: ReactNode
}) {
  const { t } = useTranslation('admin')
  return (
    <div className='space-y-5 pb-12'>
      <header className='min-w-0'>
        <Link
          to={returnTo || '/dashboard/admin/operations/reference'}
          className='mb-3 inline-flex items-center gap-2 text-xs font-bold text-primary'
        >
          <ArrowLeft className='size-4' />
          {t('operations.reference.backPrevious')}
        </Link>
        <p className='text-xs font-bold uppercase tracking-[0.18em] text-primary'>{t('operations.eyebrow')}</p>
        <h1 className='mt-1 text-2xl font-bold text-foreground'>{title}</h1>
        <p className='mt-2 max-w-3xl text-sm leading-6 text-muted-foreground'>{description}</p>
      </header>
      {children}
    </div>
  )
}

function LookupPageDirectory({ returnTo }: { returnTo: string }) {
  const { t } = useTranslation('admin')
  const referenceReturnTo = `/dashboard/admin/operations/reference?returnTo=${encodeURIComponent(returnTo)}`
  const pages = [
    ['series', BookOpen, t('operations.reference.series'), t('operations.reference.seriesHelp')],
    ['directories', Library, t('operations.reference.directories'), t('operations.reference.directoriesHelp')]
  ] as const

  return (
    <Panel
      icon={Search}
      title={t('operations.reference.lookupPages')}
      description={t('operations.reference.lookupPagesDescription')}
    >
      <div className='grid gap-3 md:grid-cols-2'>
        {pages.map(([path, Icon, title, description]) => (
          <Link
            key={path}
            to={`/dashboard/admin/operations/reference/${path}?returnTo=${encodeURIComponent(referenceReturnTo)}`}
            className='group flex min-w-0 items-start gap-3 rounded-lg border border-border p-4 transition-colors hover:border-primary/60 hover:bg-muted/60'
          >
            <span className='grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary'>
              <Icon className='size-4' />
            </span>
            <span className='min-w-0'>
              <span className='block text-sm font-bold text-foreground'>{title}</span>
              <span className='mt-1 block text-xs leading-5 text-muted-foreground'>{description}</span>
              <span className='mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary'>
                {t('operations.reference.openLookup')}
                <Link2 className='size-3.5' />
              </span>
            </span>
          </Link>
        ))}
      </div>
    </Panel>
  )
}
function Panel({
  icon: Icon,
  title,
  description,
  children
}: {
  icon?: LucideIcon
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
      <div className='mb-4 flex min-w-0 items-start gap-3'>
        {Icon && (
          <span className='mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary'>
            <Icon className='size-4' />
          </span>
        )}
        <div className='min-w-0'>
          <h2 className='text-base font-bold text-foreground'>{title}</h2>
          {description && <p className='mt-1 text-xs leading-5 text-muted-foreground'>{description}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

function LoadButton({ label }: { label: string }) {
  return <button className={`${modalButtonClass} bg-primary text-primary-foreground`}>{label}</button>
}
