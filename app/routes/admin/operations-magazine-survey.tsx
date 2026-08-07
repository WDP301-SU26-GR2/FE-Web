/* eslint-disable @typescript-eslint/no-explicit-any */
import { useLoaderData, useFetcher, type ClientLoaderFunctionArgs, type ClientActionFunctionArgs } from 'react-router'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  BookOpen,
  Calendar,
  ChartBar,
  CheckCircle2,
  Clock,
  Loader2,
  Plus
} from 'lucide-react'
import {
  surveyControllerCreateSurveyPeriod,
  surveyControllerFinalizeRanking,
  surveyControllerGetEligibleSeries,
  surveyControllerGetSurveyPeriodById,
  surveyControllerGetSurveyPeriods,
  surveyControllerGetSurveyPeriodSurveyData,
  surveyControllerGetSurveyPeriodVotes,
  surveyControllerImportSurveyData,
  surveyControllerGetRankingRecords,
  surveyControllerUpdateSurveyPeriodStatus
} from '~/api/operations/survey/survey'
import {
  magazineControllerCreateMagazine,
  magazineControllerDeleteMagazine,
  magazineControllerGetMagazines,
  magazineControllerUpdateMagazine
} from '~/api/operations/magazines/magazines'
import { seriesAdminControllerUpdateSlot } from '~/api/operations/admin-series/admin-series'
import { seriesControllerListSeries } from '~/api/operations/series/series'
import { EditorSurveysPage } from '~/features/editor'
import { Dialog } from '~/shared/ui/dialog'
import { loadAllOffsetItems } from '~/shared/lib/api/load-all-offset-items'
import type { SurveyControllerGetEligibleSeriesPublicationType } from '~/api/model/survey'
import {
  getEligibleSeriesForScope,
  getSeriesStatusTranslationKey,
  isValidSurveyTransition
} from '~/features/admin/operations/admin-reference-display'

const PUBLICATION_TYPES = ['WEEKLY', 'MONTHLY', 'IRREGULAR'] as const

export async function clientLoader({ request }: ClientLoaderFunctionArgs) {
  const searchParams = new URL(request.url).searchParams
  const focusSurveyId = (searchParams.get('surveyId') || searchParams.get('referenceId') || '').trim()
  const tab = searchParams.get('tab') || (focusSurveyId ? 'surveys' : 'magazines')
  try {
    const [series, surveys, magazines] = await Promise.all([
      loadAllOffsetItems((pagination) => seriesControllerListSeries(pagination).then((response) => response.data)),
      loadSurveyPeriods(),
      magazineControllerGetMagazines()
    ])
    const orderedSurveys = [...new Map(surveys.map((survey) => [survey.id, survey])).values()].sort(
      (left, right) => new Date(right.startDate).getTime() - new Date(left.startDate).getTime()
    )
    const selectedSurveyId = orderedSurveys.some((survey) => survey.id === focusSurveyId)
      ? focusSurveyId
      : (orderedSurveys.find((survey) => survey.status === 'OPEN')?.id ??
        orderedSurveys.find((survey) => survey.status === 'CLOSED')?.id ??
        orderedSurveys[0]?.id ??
        '')
    const selectedSurvey = orderedSurveys.find((survey) => survey.id === selectedSurveyId)
    const [detail, votes, surveyData, rankings] = selectedSurveyId
      ? await Promise.all([
          surveyControllerGetSurveyPeriodById({ id: selectedSurveyId }),
          surveyControllerGetSurveyPeriodVotes({ id: selectedSurveyId }).catch(() => null),
          surveyControllerGetSurveyPeriodSurveyData({ id: selectedSurveyId }).catch(() => null),
          selectedSurvey?.status === 'REFLECTED'
            ? surveyControllerGetRankingRecords({ id: selectedSurveyId }).catch(() => null)
            : Promise.resolve(null)
        ])
      : [null, null, null, null]
    return {
      series,
      eligibleSeriesCandidates: series,
      surveys: orderedSurveys,
      magazines: magazines.data.items,
      selectedSurvey: detail?.data ?? null,
      selectedSurveyId,
      votes: votes?.data ?? [],
      surveyData: surveyData?.data ?? [],
      rankings: rankings?.data.items ?? [],
      tab,
      hasError: false
    }
  } catch {
    return {
      series: [],
      eligibleSeriesCandidates: [],
      surveys: [],
      magazines: [],
      selectedSurvey: null,
      selectedSurveyId: '',
      votes: [],
      surveyData: [],
      rankings: [],
      tab,
      hasError: true
    }
  }
}

export async function clientAction({ request }: ClientActionFunctionArgs) {
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')

  try {
    if (intent === 'createMagazine') {
      await magazineControllerCreateMagazine({
        name: required(form, 'name'),
        publicationTypes: publicationTypes(form)
      })
      return { ok: true, intent, message: 'Magazine created successfully.' }
    }
    if (intent === 'updateMagazine') {
      await magazineControllerUpdateMagazine(
        { name: required(form, 'name') },
        { publicationTypes: publicationTypes(form) }
      )
      return { ok: true, intent, message: 'Magazine updated successfully.' }
    }
    if (intent === 'deleteMagazine') {
      await magazineControllerDeleteMagazine({ name: required(form, 'name') })
      return { ok: true, intent, message: 'Magazine deleted successfully.' }
    }
    if (intent === 'updateSeriesSlot') {
      await seriesAdminControllerUpdateSlot(
        { id: required(form, 'seriesId') },
        {
          magazine: required(form, 'magazine'),
          startIssueNumber: integer(form, 'startIssueNumber'),
          publicationType: publicationType(form)
        }
      )
      return { ok: true, intent, message: 'Series slot updated successfully.' }
    }
    if (intent === 'createSurvey') {
      const issueNumber = positiveInteger(form, 'issueNumber')
      const magazine = required(form, 'magazine').trim()
      const publicationType = publicationTypeValue(form)
      const startDate = date(form, 'startDate', false)
      const endDate = date(form, 'endDate', true)
      const eligibleSeriesIds = [...new Set(form.getAll('eligibleSeriesId').map(String).filter(Boolean))]
      if (new Date(endDate) <= new Date(startDate)) return { ok: false, intent, error: 'Invalid dates.' }
      if (eligibleSeriesIds.length === 0) return { ok: false, intent, error: 'Select at least one series.' }
      const eligibleSeries = await surveyControllerGetEligibleSeries({ magazine, publicationType })
      const eligibleIds = new Set(eligibleSeries.data.items.map((item) => item.id))
      if (eligibleSeriesIds.some((seriesId) => !eligibleIds.has(seriesId))) {
        return { ok: false, intent, error: 'The selected series do not match the magazine scope.' }
      }
      await surveyControllerCreateSurveyPeriod({
        issueNumber,
        magazine,
        publicationType,
        eligibleSeriesIds,
        startDate,
        endDate,
        status: 'DRAFT'
      })
      return { ok: true, intent, message: 'Survey period created.' }
    }
    if (intent === 'surveyStatus') {
      const surveyId = required(form, 'surveyId')
      const status = required(form, 'status') as 'OPEN' | 'CLOSED'
      const period = await surveyControllerGetSurveyPeriodById({ id: surveyId })
      const validTransition = isValidSurveyTransition(period.data.status, status)
      if (!validTransition) return { ok: false, intent, error: 'Invalid status transition.' }
      await surveyControllerUpdateSurveyPeriodStatus({ id: surveyId }, { status })
      return { ok: true, intent, message: status === 'OPEN' ? 'Survey opened.' : 'Survey closed.' }
    }
    if (intent === 'finalizeRanking') {
      const surveyId = required(form, 'surveyId')
      const period = await surveyControllerGetSurveyPeriodById({ id: surveyId })
      if (period.data.status !== 'CLOSED') return { ok: false, intent, error: 'Survey must be closed.' }
      await surveyControllerFinalizeRanking({ id: surveyId })
      return { ok: true, intent, message: 'Ranking finalized.' }
    }
    if (intent === 'importVotes') {
      const surveyId = required(form, 'surveyId')
      const period = await surveyControllerGetSurveyPeriodById({ id: surveyId })
      if (period.data.status !== 'CLOSED') return { ok: false, intent, error: 'Survey must be closed.' }
      const eligibleIds = new Set(period.data.eligibleSeriesIds)
      const ids = form.getAll('voteSeriesId').map(String)
      const counts = form.getAll('voteCount').map(Number)
      const totals = new Map<string, number>()
      for (const [index, seriesId] of ids.entries()) {
        const voteCount = counts[index]
        if (!seriesId || !eligibleIds.has(seriesId) || !Number.isInteger(voteCount) || voteCount < 0)
          return { ok: false, intent, error: 'Invalid import data.' }
        totals.set(seriesId, (totals.get(seriesId) ?? 0) + voteCount)
      }
      if (totals.size === 0) return { ok: false, intent, error: 'No votes to import.' }
      await surveyControllerImportSurveyData({
        surveyPeriodId: surveyId,
        entries: [...totals].map(([seriesId, voteCount]) => ({ seriesId, voteCount }))
      })
      return { ok: true, intent, message: 'Votes imported.' }
    }
    return { ok: false, intent, error: 'Invalid action.' }
  } catch {
    return { ok: false, intent, error: 'An error occurred. Please try again.' }
  }
}

function required(form: FormData, key: string) {
  const value = String(form.get(key) ?? '').trim()
  if (!value) throw new Error(`Missing ${key}`)
  return value
}

function integer(form: FormData, key: string) {
  const value = Number(required(form, key))
  if (!Number.isInteger(value) || value < 1) throw new Error(`Invalid ${key}`)
  return value
}

function date(form: FormData, key: string, endOfDay: boolean) {
  const value = required(form, key)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid ${key}`)
    return parsed.toISOString()
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Invalid ${key}`)
  return `${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`
}

function positiveInteger(form: FormData, key: string) {
  const value = Number(required(form, key))
  if (!Number.isInteger(value) || value <= 0) throw new Error(`Invalid ${key}`)
  return value
}

function publicationTypeValue(form: FormData) {
  const value = required(form, 'publicationType')
  if (!PUBLICATION_TYPES.includes(value as (typeof PUBLICATION_TYPES)[number])) throw new Error('Invalid publication type')
  return value as (typeof PUBLICATION_TYPES)[number]
}

function publicationType(form: FormData) {
  const value = required(form, 'publicationType')
  if (value !== 'WEEKLY' && value !== 'MONTHLY' && value !== 'IRREGULAR') throw new Error('Invalid publicationType')
  return value
}

function publicationTypes(form: FormData) {
  const values = form
    .getAll('publicationTypes')
    .map(String)
    .filter((value) => value === 'WEEKLY' || value === 'MONTHLY' || value === 'IRREGULAR')
  if (!values.length) throw new Error('Missing publicationTypes')
  return [...new Set(values)] as Array<'WEEKLY' | 'MONTHLY' | 'IRREGULAR'>
}

async function loadSurveyPeriods() {
  return loadAllOffsetItems((pagination) =>
    surveyControllerGetSurveyPeriods(pagination).then((response) => response.data)
  )
}

export default function MagazineSurveyRoute() {
  const { t } = useTranslation('admin')
  const loaderData = useLoaderData<typeof clientLoader>()
  const [activeTab, setActiveTab] = useState(loaderData.tab)

  const fetcher = useFetcher()

  useEffect(() => {
    const data = fetcher.data as { ok?: boolean; message?: string; error?: string } | undefined
    if (data) {
      if (data.ok) {
        toast.success(data.message || 'Success')
      } else if (data.error) {
        toast.error(data.error)
      }
    }
  }, [fetcher.data])

  if (loaderData.hasError) {
    return (
      <div className='space-y-6'>
        <BackLink />
        <div className='rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-destructive'>
          <p className='font-bold'>{t('operations.magazineSurvey.loadError')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-6 pb-12'>
      <BackLink />
      <header>
        <p className='text-xs font-bold uppercase tracking-[0.18em] text-primary'>{t('operations.eyebrow')}</p>
        <h1 className='mt-1 text-2xl font-bold text-foreground'>{t('operations.magazineSurvey.title')}</h1>
        <p className='mt-2 text-sm text-muted-foreground'>{t('operations.magazineSurvey.subtitle')}</p>
      </header>

      <div className='flex gap-1 rounded-xl border border-border p-1'>
        <TabButton active={activeTab === 'magazines'} onClick={() => setActiveTab('magazines')} icon={BookOpen} label={t('operations.magazineSurvey.tabs.magazines')} count={loaderData.magazines.length} />
        <TabButton active={activeTab === 'surveys'} onClick={() => setActiveTab('surveys')} icon={Calendar} label={t('operations.magazineSurvey.tabs.surveys')} count={loaderData.surveys.length} />
      </div>

      {activeTab === 'magazines' && (
        <MagazineTab
          magazines={loaderData.magazines}
          fetcher={fetcher}
        />
      )}
      {activeTab === 'surveys' && (
        <SurveyTab
          surveys={loaderData.surveys}
          series={loaderData.series}
          magazines={loaderData.magazines}
          fetcher={fetcher}
          legacySurveyProps={{
            eligibleSeriesCandidates: loaderData.eligibleSeriesCandidates,
            selectedSurvey: loaderData.selectedSurvey,
            selectedSurveyId: loaderData.selectedSurveyId,
            votes: loaderData.votes,
            surveyData: loaderData.surveyData,
            rankings: loaderData.rankings,
            hasError: loaderData.hasError
          }}
        />
      )}
    </div>
  )
}

function BackLink() {
  const { t } = useTranslation('admin')
  return (
    <a href='/dashboard/admin/operations' className='inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline'>
      <svg className='size-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' /></svg>
      {t('operations.back')}
    </a>
  )
}

function TabButton({ active, onClick, icon: Icon, label, count }: { active: boolean; onClick: () => void; icon: any; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition-all ${
        active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'
      }`}
    >
      <Icon className='size-4' />
      {label}
      <span className={`rounded-full px-2 py-0.5 text-[10px] ${active ? 'bg-primary-foreground/20' : 'bg-muted'}`}>{count}</span>
    </button>
  )
}

function MagazineTab({ magazines, fetcher }: { magazines: any[]; fetcher: any }) {
  const { t } = useTranslation('admin')
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editingMagazine, setEditingMagazine] = useState<any | null>(null)
  const pageSize = 10
  const [page, setPage] = useState(1)
  const pageCount = Math.max(1, Math.ceil(magazines.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const visibleMagazines = magazines.slice((safePage - 1) * pageSize, safePage * pageSize)

  return (
    <>
      <div className='flex justify-end gap-2'>
        <button onClick={() => setModal('add')} className='inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90'>
          <Plus className='size-4' />
          {t('operations.reference.addMagazine')}
        </button>
      </div>

      <div className='overflow-hidden rounded-xl border border-border bg-card'>
        <table className='w-full'>
          <thead>
            <tr className='border-b border-border bg-muted/50'>
              <th className='px-4 py-3 text-left text-xs font-bold text-muted-foreground'>{t('operations.magazineSurvey.magazine')}</th>
              <th className='px-4 py-3 text-left text-xs font-bold text-muted-foreground'>{t('operations.magazineSurvey.publicationTypes')}</th>
              <th className='px-4 py-3 text-right text-xs font-bold text-muted-foreground'>{t('operations.magazineSurvey.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {visibleMagazines.map((m) => (
              <tr key={m.name} className='border-b border-border last:border-b-0 hover:bg-muted/30'>
                <td className='px-4 py-3'>
                  <span className='font-bold text-foreground'>{m.name}</span>
                </td>
                <td className='px-4 py-3'>
                  <div className='flex gap-1'>
                    {m.publicationTypes.map((pt: string) => (
                      <span key={pt} className='rounded-md bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary'>
                        {t(`operations.publicationTypes.${pt}`)}
                      </span>
                    ))}
                  </div>
                </td>
                <td className='px-4 py-3 text-right'>
                  <button onClick={() => { setEditingMagazine(m); setModal('edit') }} className='inline-flex h-8 items-center gap-1 rounded-md border border-border bg-card px-3 text-xs font-bold hover:bg-muted'>
                    <svg className='size-3.5' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' /></svg>
                    {t('operations.reference.editMagazine')}
                  </button>
                </td>
              </tr>
            ))}
            {!magazines.length && (
              <tr>
                <td colSpan={3} className='px-4 py-8 text-center text-xs text-muted-foreground'>{t('operations.reference.emptyMagazines')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {magazines.length > pageSize && (
        <PaginationControls
          page={safePage}
          pageCount={pageCount}
          onPrevious={() => setPage((current) => Math.max(1, current - 1))}
          onNext={() => setPage((current) => Math.min(pageCount, current + 1))}
          label={t('operations.magazineSurvey.pagination', { page, pageCount })}
          previousLabel={t('operations.magazineSurvey.previous')}
          nextLabel={t('operations.magazineSurvey.next')}
        />
      )}

      {modal === 'add' && <AddMagazineDialog onClose={() => setModal(null)} fetcher={fetcher} />}
      {modal === 'edit' && editingMagazine && <EditMagazineDialog magazine={editingMagazine} onClose={() => { setModal(null); setEditingMagazine(null) }} fetcher={fetcher} />}
    </>
  )
}

function PaginationControls({
  page,
  pageCount,
  onPrevious,
  onNext,
  label,
  previousLabel,
  nextLabel
}: {
  page: number
  pageCount: number
  onPrevious: () => void
  onNext: () => void
  label: string
  previousLabel: string
  nextLabel: string
}) {
  return (
    <nav className='flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3' aria-label={label}>
      <button type='button' onClick={onPrevious} disabled={page <= 1} className='rounded-lg border border-border px-3 py-2 text-xs font-bold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40'>
        {previousLabel}
      </button>
      <span className='text-xs font-semibold text-muted-foreground'>{label}</span>
      <button type='button' onClick={onNext} disabled={page >= pageCount} className='rounded-lg border border-border px-3 py-2 text-xs font-bold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40'>
        {nextLabel}
      </button>
    </nav>
  )
}

function AddMagazineDialog({ onClose, fetcher }: { onClose: () => void; fetcher: any }) {
  const { t } = useTranslation('admin')
  return (
    <Dialog open onClose={onClose} titleId='add-magazine' title={t('operations.reference.addMagazine')} description={t('operations.reference.addMagazineHelp')} size='md'>
      <fetcher.Form method='post' className='space-y-4'>
        <input type='hidden' name='intent' value='createMagazine' />
        <label className='grid gap-1.5 text-xs font-bold'>
          {t('operations.reference.magazineName')}
          <input name='name' required className='h-10 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none focus:border-primary' />
        </label>
        <fieldset className='grid gap-2'>
          <legend className='text-xs font-bold'>{t('operations.reference.publicationTypes')}</legend>
          <div className='grid grid-cols-3 gap-2'>
            {PUBLICATION_TYPES.map((pt) => (
              <label key={pt} className='flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs'>
                <input type='checkbox' name='publicationTypes' value={pt} defaultChecked={pt === 'WEEKLY'} className='size-4 accent-primary' />
                {t(`operations.publicationTypes.${pt}`)}
              </label>
            ))}
          </div>
        </fieldset>
        <div className='flex justify-end gap-2 border-t border-border pt-4'>
          <button type='button' onClick={onClose} className='h-10 rounded-lg border border-border px-4 text-xs font-bold'>{t('common.cancel')}</button>
          <button type='submit' disabled={fetcher.state !== 'idle'} className='inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-50'>
            {fetcher.state !== 'idle' && <Loader2 className='size-4 animate-spin' />}
            {t('operations.reference.saveMagazine')}
          </button>
        </div>
      </fetcher.Form>
    </Dialog>
  )
}

function EditMagazineDialog({ magazine, onClose, fetcher }: { magazine: any; onClose: () => void; fetcher: any }) {
  const { t } = useTranslation('admin')
  return (
    <Dialog open onClose={onClose} titleId='edit-magazine' title={t('operations.reference.editMagazineTitle', { name: magazine.name })} description={t('operations.reference.editMagazineHelp')} size='md'>
      <fetcher.Form method='post' className='space-y-4'>
        <input type='hidden' name='intent' value='updateMagazine' />
        <input type='hidden' name='name' value={magazine.name} />
        <fieldset className='grid gap-2'>
          <legend className='text-xs font-bold'>{t('operations.reference.publicationTypes')}</legend>
          <div className='grid grid-cols-3 gap-2'>
            {PUBLICATION_TYPES.map((pt) => (
              <label key={pt} className='flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs'>
                <input type='checkbox' name='publicationTypes' value={pt} defaultChecked={magazine.publicationTypes.includes(pt)} className='size-4 accent-primary' />
                {t(`operations.publicationTypes.${pt}`)}
              </label>
            ))}
          </div>
        </fieldset>
        <div className='flex justify-end gap-2 border-t border-border pt-4'>
          <button type='button' onClick={onClose} className='h-10 rounded-lg border border-border px-4 text-xs font-bold'>{t('common.cancel')}</button>
          <button type='submit' disabled={fetcher.state !== 'idle'} className='inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-50'>
            {fetcher.state !== 'idle' && <Loader2 className='size-4 animate-spin' />}
            {t('operations.reference.updateMagazine')}
          </button>
        </div>
      </fetcher.Form>
    </Dialog>
  )
}

function UpdateSlotDialog({
  magazines,
  series,
  initialMagazine,
  initialPublicationType,
  onClose,
  fetcher
}: {
  magazines: any[]
  series: any[]
  initialMagazine?: string | null
  initialPublicationType?: string | null
  onClose: () => void
  fetcher: any
}) {
  const { t } = useTranslation('admin')
  const defaultMagazine: string = magazines.some((item: any) => item.name === initialMagazine) ? (initialMagazine ?? '') : magazines[0]?.name ?? ''
  const [slotMagazine, setSlotMagazine] = useState(defaultMagazine)
  const slotPublicationTypes = magazines.find((item: any) => item.name === slotMagazine)?.publicationTypes ?? []
  const defaultPublicationType: string = slotPublicationTypes.includes(initialPublicationType) ? (initialPublicationType ?? '') : slotPublicationTypes[0] ?? ''
  const [slotPublicationType, setSlotPublicationType] = useState<string>(defaultPublicationType)
  return (
    <Dialog open onClose={onClose} titleId='update-slot' title={t('operations.reference.updateSeriesSlot')} description={t('operations.reference.updateSeriesSlotHelp')} size='md'>
      <fetcher.Form method='post' className='space-y-4'>
        <input type='hidden' name='intent' value='updateSeriesSlot' />
        <label className='grid gap-1.5 text-xs font-bold'>
          {t('operations.reference.selectSeries')}
          <select name='seriesId' required className='h-10 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none focus:border-primary'>
            <option value=''>{t('operations.reference.selectSeries')}</option>
            {series.map((s: any) => <option key={s.id} value={s.id}>{s.title ?? s.id}</option>)}
          </select>
        </label>
        <label className='grid gap-1.5 text-xs font-bold'>
          {t('operations.reference.selectMagazine')}
          <select name='magazine' required value={slotMagazine} onChange={(e) => {
            const nextMagazine = e.target.value
            const nextTypes = magazines.find((item: any) => item.name === nextMagazine)?.publicationTypes ?? []
            setSlotMagazine(nextMagazine)
            setSlotPublicationType(nextTypes[0] ?? '')
          }} className='h-10 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none focus:border-primary'>
            {magazines.map((m: any) => <option key={m.name} value={m.name}>{m.name}</option>)}
          </select>
        </label>
        <div className='grid grid-cols-2 gap-4'>
          <label className='grid gap-1.5 text-xs font-bold'>
            {t('operations.reference.startIssueNumber')}
            <input name='startIssueNumber' type='number' min={1} required className='h-10 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none focus:border-primary' />
          </label>
          <label className='grid gap-1.5 text-xs font-bold'>
            {t('operations.reference.selectPublicationType')}
            <select name='publicationType' required value={slotPublicationType} onChange={(e) => setSlotPublicationType(e.target.value)} className='h-10 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none focus:border-primary'>
              {slotPublicationTypes.map((pt: string) => <option key={pt} value={pt}>{t(`operations.publicationTypes.${pt}`)}</option>)}
            </select>
          </label>
        </div>
        <div className='flex justify-end gap-2 border-t border-border pt-4'>
          <button type='button' onClick={onClose} className='h-10 rounded-lg border border-border px-4 text-xs font-bold'>{t('common.cancel')}</button>
          <button type='submit' disabled={fetcher.state !== 'idle'} className='inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-50'>
            {fetcher.state !== 'idle' && <Loader2 className='size-4 animate-spin' />}
            {t('operations.reference.saveSeriesSlot')}
          </button>
        </div>
      </fetcher.Form>
    </Dialog>
  )
}

function SurveyTab({
  surveys,
  series,
  magazines,
  fetcher,
  legacySurveyProps
}: {
  surveys: any[]
  series: any[]
  magazines: any[]
  fetcher: any
  legacySurveyProps: {
    eligibleSeriesCandidates: any[]
    selectedSurvey: any
    selectedSurveyId: string
    votes: any[]
    surveyData: any[]
    rankings: any[]
    hasError: boolean
  }
}) {
  const { t } = useTranslation('admin')
  const [modal, setModal] = useState<'create' | 'slot' | null>(null)
  const [selectedSurvey, setSelectedSurvey] = useState<any | null>(null)

  const sortedSurveys = [...surveys].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
  const seriesById = new Map(series.map((item) => [item.id, item.title]))

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; icon: typeof Clock }> = {
      DRAFT: { bg: 'bg-slate-100 text-slate-700', icon: Clock },
      OPEN: { bg: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
      CLOSED: { bg: 'bg-amber-100 text-amber-700', icon: Clock },
      REFLECTED: { bg: 'bg-blue-100 text-blue-700', icon: CheckCircle2 }
    }
    const badge = badges[status] || { bg: 'bg-muted text-muted-foreground', icon: Clock }
    const Icon = badge.icon
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${badge.bg}`}>
        <Icon className='size-3.5' />
        {t(`operations.surveyStatuses.${status}`, { defaultValue: status })}
      </span>
    )
  }

  const surveyScope = legacySurveyProps.selectedSurvey
  const surveyWorkspace = legacySurveyProps ? (
    <>
      <div className='flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/15 bg-primary/5 p-4'>
        <div className='flex min-w-0 items-start gap-3'>
          <span className='grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary'><ChartBar className='size-5' /></span>
          <div className='min-w-0'>
            <p className='text-sm font-bold text-foreground'>{t('operations.reference.slotWorkspaceTitle')}</p>
            <p className='mt-1 text-xs text-muted-foreground'>{t('operations.reference.slotWorkspaceDescription')}</p>
          </div>
        </div>
        <button type='button' onClick={() => setModal('slot')} disabled={!magazines.length || !series.length} className='inline-flex shrink-0 items-center gap-2 rounded-lg border border-primary/25 bg-card px-4 py-2.5 text-xs font-bold text-primary hover:bg-primary/5 disabled:opacity-50'>
          <ChartBar className='size-4' />
          {t('operations.reference.updateSeriesSlot')}
        </button>
      </div>
      <EditorSurveysPage
        series={series}
        eligibleSeriesCandidates={legacySurveyProps.eligibleSeriesCandidates}
        surveys={surveys}
        selectedSurvey={legacySurveyProps.selectedSurvey}
        selectedSurveyId={legacySurveyProps.selectedSurveyId}
        votes={legacySurveyProps.votes}
        surveyData={legacySurveyProps.surveyData}
        rankings={legacySurveyProps.rankings}
        hasError={legacySurveyProps.hasError}
        backPath='/dashboard/admin/operations'
        configPath='/dashboard/admin/settings'
        adminMode
        embedded
      />
      {modal === 'slot' && <UpdateSlotDialog magazines={magazines} series={series} initialMagazine={surveyScope?.magazine} initialPublicationType={surveyScope?.publicationType} onClose={() => setModal(null)} fetcher={fetcher} />}
    </>
  ) : null

  if (legacySurveyProps) return surveyWorkspace

  return (
    <>
      <div className='flex items-center justify-between gap-3 rounded-xl border border-primary/15 bg-primary/5 p-4'>
        <div>
          <p className='text-sm font-bold text-foreground'>{t('operations.surveys.workspaceTitle')}</p>
          <p className='mt-1 text-xs text-muted-foreground'>{t('operations.surveys.workspaceDescription')}</p>
        </div>
        <button onClick={() => setModal('create')} disabled={!magazines.length} className='inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50'>
          <Plus className='size-4' />
          {t('operations.surveys.create')}
        </button>
      </div>

      <div className='grid gap-4 lg:grid-cols-2'>
        {sortedSurveys.map((survey) => (
          <article key={survey.id} className='overflow-hidden rounded-xl border border-border bg-card shadow-sm'>
            <header className='border-b border-border bg-muted/20 px-5 py-4'>
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div className='flex min-w-0 items-center gap-3'>
                  <span className='grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-sm font-extrabold text-primary'>#{survey.issueNumber}</span>
                  <div className='min-w-0'>
                    <h3 className='truncate font-bold text-foreground'>{survey.magazine || t('common.notAvailable')}</h3>
                    <p className='mt-1 text-xs text-muted-foreground'>{t(`operations.publicationTypes.${survey.publicationType}`)}</p>
                  </div>
                </div>
                {getStatusBadge(survey.status)}
              </div>
            </header>
            <dl className='grid grid-cols-2 gap-3 px-5 py-4'>
              <div className='rounded-lg bg-muted/30 p-3'>
                <dt className='text-[11px] font-semibold text-muted-foreground'>{t('operations.surveys.period')}</dt>
                <dd className='mt-1 text-xs font-bold text-foreground'>{formatDate(survey.startDate)} – {formatDate(survey.endDate)}</dd>
              </div>
              <div className='rounded-lg bg-muted/30 p-3'>
                <dt className='text-[11px] font-semibold text-muted-foreground'>{t('operations.surveys.eligibleSeries')}</dt>
                <dd className='mt-1 text-xs font-bold text-foreground'>{survey.eligibleSeriesIds?.length || 0} {t('operations.surveys.seriesUnit')}</dd>
              </div>
            </dl>
            <div className='border-t border-border px-5 py-3'>
              <p className='text-[11px] font-semibold text-muted-foreground'>{t('operations.surveys.seriesInPeriod')}</p>
              <p className='mt-1 truncate text-xs text-foreground'>
                {(survey.eligibleSeriesIds || []).slice(0, 3).map((id: string) => seriesById.get(id) || id).join(', ') || t('common.notAvailable')}
                {(survey.eligibleSeriesIds?.length || 0) > 3 && ` +${survey.eligibleSeriesIds.length - 3}`}
              </p>
            </div>
            <footer className='flex flex-wrap items-center justify-end gap-2 border-t border-border bg-muted/10 px-5 py-3'>
              <button type='button' onClick={() => setSelectedSurvey(survey)} className='inline-flex h-9 items-center rounded-lg border border-border bg-card px-3 text-xs font-bold text-foreground hover:bg-muted'>
                {t('operations.surveys.viewDetails')}
              </button>
              <div className='flex gap-2'>
                {survey.status === 'DRAFT' && (
                  <fetcher.Form method='post'>
                    <input type='hidden' name='intent' value='surveyStatus' />
                    <input type='hidden' name='surveyId' value={survey.id} />
                    <input type='hidden' name='status' value='OPEN' />
                    <button type='submit' disabled={fetcher.state !== 'idle'} className='inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-500 px-4 text-xs font-bold text-white shadow-sm hover:bg-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 transition-all'>
                      {t('operations.surveys.open')}
                    </button>
                  </fetcher.Form>
                )}
                {survey.status === 'OPEN' && (
                  <fetcher.Form method='post'>
                    <input type='hidden' name='intent' value='surveyStatus' />
                    <input type='hidden' name='surveyId' value={survey.id} />
                    <input type='hidden' name='status' value='CLOSED' />
                    <button type='submit' disabled={fetcher.state !== 'idle'} className='inline-flex h-9 items-center gap-1.5 rounded-lg bg-amber-500 px-4 text-xs font-bold text-white shadow-sm hover:bg-amber-600 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 transition-all'>
                      {t('operations.surveys.close')}
                    </button>
                  </fetcher.Form>
                )}
                {survey.status === 'CLOSED' && (
                  <fetcher.Form method='post'>
                    <input type='hidden' name='intent' value='finalizeRanking' />
                    <input type='hidden' name='surveyId' value={survey.id} />
                    <button type='submit' disabled={fetcher.state !== 'idle'} className='inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-500 px-4 text-xs font-bold text-white shadow-sm hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-all'>
                      {t('operations.surveys.finalize')}
                    </button>
                  </fetcher.Form>
                )}
              </div>
            </footer>
          </article>
        ))}
        {!sortedSurveys.length && (
          <div className='rounded-xl border border-border bg-card p-8 text-center lg:col-span-2'>
            <Calendar className='mx-auto size-10 text-muted-foreground/50' />
            <p className='mt-3 text-sm font-semibold text-muted-foreground'>{t('operations.surveys.empty')}</p>
          </div>
        )}
      </div>

      {modal === 'create' && <CreateSurveyDialog magazines={magazines} onClose={() => setModal(null)} fetcher={fetcher} />}
      {selectedSurvey && <SurveyDetailsDialog survey={selectedSurvey} series={series} onClose={() => setSelectedSurvey(null)} fetcher={fetcher} />}
    </>
  )
}

function CreateSurveyDialog({ magazines, onClose, fetcher }: { magazines: any[]; onClose: () => void; fetcher: any }) {
  const { t } = useTranslation('admin')
  const [magazine, setMagazine] = useState(magazines[0]?.name ?? '')
  const firstTypes = magazines[0]?.publicationTypes ?? []
  const [publicationType, setPublicationType] = useState(firstTypes[0] ?? '')
  const [series, setSeries] = useState<any[]>([])
  const [loadingSeries, setLoadingSeries] = useState(false)
  const [seriesError, setSeriesError] = useState(false)

  const publicationTypes = magazines.find((m: any) => m.name === magazine)?.publicationTypes || []

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!magazine || !publicationType) {
      setSeries([])
      return
    }
    let cancelled = false
    setLoadingSeries(true)
    setSeriesError(false)
    surveyControllerGetEligibleSeries({
      magazine,
      publicationType: publicationType as SurveyControllerGetEligibleSeriesPublicationType
    })
      .then((response) => {
        if (!cancelled) setSeries(getEligibleSeriesForScope(response.data.items, magazine, publicationType))
      })
      .catch(() => {
        if (!cancelled) {
          setSeries([])
          setSeriesError(true)
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSeries(false)
      })
    return () => {
      cancelled = true
    }
  }, [magazine, publicationType])
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <Dialog open onClose={onClose} titleId='create-survey' title={t('operations.surveys.create')} description={t('operations.surveys.createHelp')} size='lg'>
      <fetcher.Form method='post' className='space-y-4'>
        <input type='hidden' name='intent' value='createSurvey' />
        <div className='grid gap-4 sm:grid-cols-3'>
          <label className='grid gap-1.5 text-xs font-bold'>
            {t('operations.surveys.issueNumber')}
            <input name='issueNumber' type='number' min={1} required className='h-10 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none focus:border-primary' />
          </label>
          <label className='grid gap-1.5 text-xs font-bold'>
            {t('operations.surveys.startDate')}
            <input name='startDate' type='date' required className='h-10 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none focus:border-primary' />
          </label>
          <label className='grid gap-1.5 text-xs font-bold'>
            {t('operations.surveys.endDate')}
            <input name='endDate' type='date' required className='h-10 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none focus:border-primary' />
          </label>
        </div>
        <div className='grid gap-4 sm:grid-cols-2'>
          <label className='grid gap-1.5 text-xs font-bold'>
            {t('operations.surveys.magazine')}
            <select name='magazine' required value={magazine} onChange={(e) => { const nextMagazine = e.target.value; setMagazine(nextMagazine); setPublicationType(magazines.find((item: any) => item.name === nextMagazine)?.publicationTypes?.[0] ?? '') }} className='h-10 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none focus:border-primary'>
              <option value=''>{t('operations.surveys.selectMagazine')}</option>
              {magazines.map((item: any) => <option key={item.name} value={item.name}>{item.name}</option>)}
            </select>
          </label>
          <label className='grid gap-1.5 text-xs font-bold'>
            {t('operations.surveys.publicationType')}
            <select name='publicationType' required value={publicationType} onChange={(e) => setPublicationType(e.target.value)} className='h-10 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none focus:border-primary'>
              <option value=''>{t('operations.surveys.selectPublicationType')}</option>
              {publicationTypes.map((pt: string) => <option key={pt} value={pt}>{t(`operations.publicationTypes.${pt}`)}</option>)}
            </select>
          </label>
        </div>
        <fieldset className='grid gap-2'>
          <legend className='text-xs font-bold'>{t('operations.surveys.eligibleSeries')}</legend>
          <p className='text-xs text-muted-foreground'>{t('operations.surveys.eligibleSeriesHelp')}</p>
          <div className='max-h-52 space-y-1 overflow-y-auto rounded-lg border border-input p-2'>
            {loadingSeries && <p className='px-2 py-4 text-center text-xs text-muted-foreground'>{t('operations.surveys.loadingEligibleSeries')}</p>}
            {!loadingSeries && seriesError && <p className='px-2 py-4 text-center text-xs text-destructive'>{t('operations.surveys.eligibleSeriesError')}</p>}
            {!loadingSeries && !seriesError && !series.length && <p className='px-2 py-4 text-center text-xs text-muted-foreground'>{t('operations.surveys.noEligibleSeries')}</p>}
            {series.map((s: any) => (
              <label key={s.id} className='flex items-start gap-2 rounded-lg px-2 py-2 hover:bg-muted'>
                <input type='checkbox' name='eligibleSeriesId' value={s.id} className='size-4 accent-primary' />
                <span className='min-w-0 text-xs'><span className='block font-semibold text-foreground'>{s.title}</span><span className='text-[11px] text-muted-foreground'>{t(getSeriesStatusTranslationKey(s.status), { defaultValue: t('common.notAvailable') })}</span></span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className='flex justify-end gap-2 border-t border-border pt-4'>
          <button type='button' onClick={onClose} className='h-10 rounded-lg border border-border px-4 text-xs font-bold'>{t('common.cancel')}</button>
          <button type='submit' disabled={fetcher.state !== 'idle' || loadingSeries || !series.length} className='inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-50'>
            {fetcher.state !== 'idle' && <Loader2 className='size-4 animate-spin' />}
            {t('operations.surveys.create')}
          </button>
        </div>
      </fetcher.Form>
    </Dialog>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(value))
}

function SurveyDetailsDialog({ survey, series, onClose, fetcher }: { survey: any; series: any[]; onClose: () => void; fetcher: any }) {
  const { t } = useTranslation('admin')
  const [details, setDetails] = useState<{ period: any; rankings: any[]; imports: any[]; votes: any[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const seriesById = new Map(series.map((item) => [item.id, item.title]))

  useEffect(() => {
    let cancelled = false
    Promise.all([
      surveyControllerGetSurveyPeriodById({ id: survey.id }),
      surveyControllerGetRankingRecords({ id: survey.id }).catch(() => ({ data: { items: [] } })),
      surveyControllerGetSurveyPeriodSurveyData({ id: survey.id }).catch(() => ({ data: [] })),
      surveyControllerGetSurveyPeriodVotes({ id: survey.id }).catch(() => ({ data: [] }))
    ]).then(([period, rankings, imports, votes]) => {
      if (!cancelled) setDetails({ period: period.data, rankings: rankings.data.items, imports: imports.data, votes: votes.data })
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [survey.id])

  return (
    <Dialog open onClose={onClose} titleId='survey-details' title={t('operations.surveys.detailsTitle', { issue: survey.issueNumber })} description={t('operations.surveys.detailsDescription')} size='xl'>
      {loading && <p className='py-8 text-center text-sm text-muted-foreground'>{t('common.loading')}</p>}
      {!loading && details && (
        <div className='space-y-5'>
          <div className='grid gap-3 sm:grid-cols-4'>
            <InfoItem label={t('operations.surveys.magazine')} value={details.period.magazine || t('common.notAvailable')} />
            <InfoItem label={t('operations.surveys.publicationType')} value={t(`operations.publicationTypes.${details.period.publicationType}`)} />
            <InfoItem label={t('operations.surveys.period')} value={`${formatDate(details.period.startDate)} – ${formatDate(details.period.endDate)}`} />
            <InfoItem label={t('operations.surveys.status')} value={t(`operations.surveyStatuses.${details.period.status}`, { defaultValue: details.period.status })} />
          </div>

          {details.period.status === 'CLOSED' && (
            <section className='rounded-xl border border-border p-4'>
              <h3 className='text-sm font-bold text-foreground'>{t('operations.surveys.importTitle')}</h3>
              <p className='mt-1 text-xs text-muted-foreground'>{t('operations.surveys.importDescription')}</p>
              <fetcher.Form method='post' className='mt-3 space-y-3'>
                <input type='hidden' name='intent' value='importVotes' />
                <input type='hidden' name='surveyId' value={survey.id} />
                <div className='max-h-48 space-y-2 overflow-y-auto'>
                  {details.period.eligibleSeriesIds.map((id: string) => (
                    <div key={id} className='grid grid-cols-[minmax(0,1fr)_120px] items-center gap-3 rounded-lg bg-muted/30 p-2'>
                      <span className='truncate text-xs font-medium'>{seriesById.get(id) || id}</span>
                      <label className='grid gap-1 text-[10px] font-semibold text-muted-foreground'>
                        {t('operations.surveys.voteCount')}
                        <input name='voteCount' type='number' min={0} defaultValue={0} className='h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground' />
                      </label>
                      <input type='hidden' name='voteSeriesId' value={id} />
                    </div>
                  ))}
                </div>
                <button type='submit' disabled={fetcher.state !== 'idle'} className='h-9 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground disabled:opacity-50'>{t('operations.surveys.import')}</button>
              </fetcher.Form>
            </section>
          )}

          <section className='rounded-xl border border-border p-4'>
            <div className='flex items-center justify-between gap-3'>
              <h3 className='text-sm font-bold text-foreground'>{t('operations.surveys.rankingTitle')}</h3>
              <span className='text-xs text-muted-foreground'>{details.rankings.length} {t('operations.surveys.resultUnit')}</span>
            </div>
            {details.rankings.length ? <div className='mt-3 divide-y divide-border'>{details.rankings.map((item) => <div key={`${item.seriesId}-${item.rankPosition}`} className='flex items-center justify-between gap-3 py-2 text-xs'><span className='truncate font-semibold'>{seriesById.get(item.seriesId) || item.seriesId}</span><span className='shrink-0 font-bold'>#{item.rankPosition ?? '–'} · {item.voteCount} {t('operations.surveys.voteUnit')}</span></div>)}</div> : <p className='mt-3 text-xs text-muted-foreground'>{t('operations.surveys.noRanking')}</p>}
          </section>

          <div className='grid gap-4 sm:grid-cols-2'>
            <InfoItem label={t('operations.surveys.importHistory')} value={`${details.imports.length} ${t('operations.surveys.importUnit')}`} />
            <InfoItem label={t('operations.surveys.readerVotes')} value={`${details.votes.length} ${t('operations.surveys.voteUnit')}`} />
          </div>
        </div>
      )}
    </Dialog>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return <div className='rounded-lg bg-muted/30 p-3'><p className='text-[11px] font-semibold text-muted-foreground'>{label}</p><p className='mt-1 text-xs font-bold text-foreground'>{value}</p></div>
}
