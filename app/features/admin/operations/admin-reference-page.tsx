import { Form, Link, useFetcher } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useEffect, useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  BookOpen,
  Database,
  FileSearch,
  Library,
  Link2,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  type LucideIcon
} from 'lucide-react'
import type { MagazineListResDtoOutputItemsItem } from '~/api/model/magazines'
import { BusinessDataView } from '~/shared/components/business-data-view'
import { Dialog } from '~/shared/ui/dialog'

type SelectItem = { id: string; title?: string; issueNumber?: string | number | null; status?: string }
type AdminReferenceActionResult = {
  ok: boolean
  intent: string
  downloadUrl?: string
  expiresAt?: string
  message?: string
}

const inputClass =
  'h-10 min-w-0 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground outline-none focus:border-primary'
const modalButtonClass = 'inline-flex h-10 w-full items-center justify-center rounded-md px-4 text-xs font-bold sm:w-auto'
const referenceFieldClass = 'grid min-w-0 grid-rows-[2.5rem_auto] gap-1.5 text-xs font-semibold'
const referenceFieldLabelClass = 'flex min-h-10 items-end leading-5 text-foreground'
const PUBLICATION_TYPES = ['WEEKLY', 'MONTHLY', 'IRREGULAR'] as const

export function AdminReferencePage({
  series,
  magazines,
  periods,
  selected
}: {
  series: SelectItem[]
  magazines: MagazineListResDtoOutputItemsItem[]
  periods: SelectItem[]
  selected: Record<string, string>
}) {
  const { t } = useTranslation('admin')
  const [actionModal, setActionModal] = useState<'addMagazine' | 'updateSlot' | null>(null)
  const [editingMagazine, setEditingMagazine] = useState<MagazineListResDtoOutputItemsItem | null>(null)
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
        <ReferenceSummary magazines={magazines.length} series={series.length} periods={periods.length} />
      </header>

      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <p className='max-w-2xl text-sm leading-6 text-muted-foreground'>{t('operations.reference.description')}</p>
        <div className='flex flex-col gap-2 sm:flex-row'>
          <button
            type='button'
            onClick={() => setActionModal('updateSlot')}
            className='inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-xs font-bold text-foreground shadow-sm hover:bg-muted disabled:opacity-50'
            disabled={!magazines.length || !series.length}
          >
            <SlidersHorizontal className='size-4 text-primary' />
            {t('operations.reference.updateSeriesSlot')}
          </button>
          <button
            type='button'
            onClick={() => setActionModal('addMagazine')}
            className='inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground shadow-sm'
          >
            <Plus className='size-4' />
            {t('operations.reference.addMagazine')}
          </button>
        </div>
      </div>

      <LookupPageDirectory returnTo={returnTo} />
      <MagazineAdminPanel magazines={magazines} onEdit={setEditingMagazine} />
      {actionModal === 'addMagazine' && <AddMagazineDialog onClose={() => setActionModal(null)} />}
      {actionModal === 'updateSlot' && (
        <UpdateSeriesSlotDialog magazines={magazines} series={series} onClose={() => setActionModal(null)} />
      )}
      {editingMagazine && <EditMagazineDialog magazine={editingMagazine} onClose={() => setEditingMagazine(null)} />}
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
  seriesData: Record<string, unknown>
}) {
  const { t } = useTranslation('admin')
  return (
    <ReferenceShell title={t('operations.reference.series')} description={t('operations.reference.seriesHelp')} returnTo={selected.returnTo}>
      <Panel icon={BookOpen} title={t('operations.reference.series')} description={t('operations.reference.seriesHelp')}>
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
          <input
            className={inputClass}
            name='seriesNameId'
            defaultValue={selected.seriesNameId}
            placeholder={t('operations.reference.seriesNameId')}
          />
          <LoadButton label={t('operations.reference.load')} />
        </Form>
        <DatasetGrid data={seriesData} />
      </Panel>
    </ReferenceShell>
  )
}

export function AdminReferenceChapterPage({
  selected,
  chapterData
}: {
  selected: Record<string, string>
  chapterData: Record<string, unknown>
}) {
  const { t } = useTranslation('admin')
  return (
    <ReferenceShell title={t('operations.reference.chapter')} description={t('operations.reference.chapterHelp')} returnTo={selected.returnTo}>
      <Panel icon={FileSearch} title={t('operations.reference.chapter')} description={t('operations.reference.chapterHelp')}>
        <Form method='get' className='grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]'>
          <input type='hidden' name='returnTo' value={selected.returnTo} />
          <input
            className={inputClass}
            name='chapterId'
            defaultValue={selected.chapterId}
            placeholder={t('operations.reference.chapterId')}
            required
          />
          <input
            className={inputClass}
            name='chapterNameId'
            defaultValue={selected.chapterNameId}
            placeholder={t('operations.reference.chapterNameId')}
          />
          <LoadButton label={t('operations.reference.load')} />
        </Form>
        <DatasetGrid data={chapterData} />
      </Panel>
    </ReferenceShell>
  )
}

export function AdminReferenceRankingPage({
  periods,
  selected,
  rankingData
}: {
  periods: SelectItem[]
  selected: Record<string, string>
  rankingData: Record<string, unknown>
}) {
  const { t } = useTranslation('admin')
  return (
    <ReferenceShell title={t('operations.reference.ranking')} description={t('operations.reference.rankingHelp')} returnTo={selected.returnTo}>
      <Panel icon={Database} title={t('operations.reference.ranking')} description={t('operations.reference.rankingHelp')}>
        <Form method='get' className='grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]'>
          <input type='hidden' name='returnTo' value={selected.returnTo} />
          <select className={inputClass} name='surveyPeriodId' defaultValue={selected.surveyPeriodId} required>
            <option value=''>{t('operations.reference.selectPeriod')}</option>
            {periods.map((item) => (
              <option key={item.id} value={item.id}>
                {item.issueNumber ?? t('common.notAvailable')} -{' '}
                {item.status
                  ? t(`operations.surveyStatuses.${item.status}`, {
                      defaultValue: t('common.notAvailable')
                    })
                  : t('common.notAvailable')}
              </option>
            ))}
          </select>
          <LoadButton label={t('operations.reference.load')} />
        </Form>
        <DatasetGrid data={rankingData} />
      </Panel>
    </ReferenceShell>
  )
}

export function AdminReferenceDirectoriesPage({
  directories,
  selected
}: {
  directories: Record<string, unknown>
  selected: Record<string, string>
}) {
  const { t } = useTranslation('admin')
  return (
    <ReferenceShell title={t('operations.reference.directories')} description={t('operations.reference.directoriesHelp')} returnTo={selected.returnTo}>
      <Panel icon={Library} title={t('operations.reference.directories')} description={t('operations.reference.directoriesHelp')}>
        <DatasetGrid data={directories} />
      </Panel>
    </ReferenceShell>
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
    ['chapter', FileSearch, t('operations.reference.chapter'), t('operations.reference.chapterHelp')],
    ['ranking', Database, t('operations.reference.ranking'), t('operations.reference.rankingHelp')],
    ['directories', Library, t('operations.reference.directories'), t('operations.reference.directoriesHelp')]
  ] as const

  return (
    <Panel icon={Search} title={t('operations.reference.lookupPages')} description={t('operations.reference.lookupPagesDescription')}>
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

function ReferenceSummary({ magazines, series, periods }: { magazines: number; series: number; periods: number }) {
  const { t } = useTranslation('admin')
  return (
    <div className='flex flex-wrap gap-2'>
      <SummaryItem icon={Library} label={t('operations.reference.magazineCount')} value={magazines} />
      <SummaryItem icon={BookOpen} label={t('operations.reference.seriesCount')} value={series} />
      <SummaryItem icon={Database} label={t('operations.reference.periodCount')} value={periods} />
    </div>
  )
}

function SummaryItem({
  icon: Icon,
  label,
  value
}: {
  icon: LucideIcon
  label: string
  value: number
}) {
  return (
    <div className='inline-flex h-9 min-w-0 items-center gap-2 rounded-full border border-border bg-card px-3 text-xs font-semibold text-muted-foreground shadow-sm'>
      <Icon className='size-3.5 shrink-0 text-primary' />
      <span>{label}:</span>
      <strong className='text-foreground'>{value}</strong>
    </div>
  )
}

// Kept for the older reference layout while the current page uses the tabbed panels above.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ReferenceLookup({
  series,
  periods,
  returnTo,
  selected,
  directories,
  seriesData,
  chapterData,
  rankingData
}: {
  series: SelectItem[]
  periods: SelectItem[]
  returnTo: string
  selected: Record<string, string>
  directories: Record<string, unknown>
  seriesData: Record<string, unknown>
  chapterData: Record<string, unknown>
  rankingData: Record<string, unknown>
}) {
  const { t } = useTranslation('admin')
  return (
    <div className='grid gap-6'>
      <Panel icon={BookOpen} title={t('operations.reference.series')} description={t('operations.reference.seriesHelp')}>
        <Form method='get' className='grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]'>
          <input type='hidden' name='returnTo' value={returnTo} />
          <select className={inputClass} name='seriesId' defaultValue={selected.seriesId} required>
            <option value=''>{t('operations.reference.selectSeries')}</option>
            {series.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title ?? t('common.notAvailable')}
              </option>
            ))}
          </select>
          <input
            className={inputClass}
            name='seriesNameId'
            defaultValue={selected.seriesNameId}
            placeholder={t('operations.reference.seriesNameId')}
          />
          <LoadButton label={t('operations.reference.load')} />
        </Form>
        <DatasetGrid data={seriesData} />
      </Panel>

      <Panel icon={FileSearch} title={t('operations.reference.chapter')} description={t('operations.reference.chapterHelp')}>
        <Form method='get' className='grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]'>
          <input type='hidden' name='returnTo' value={returnTo} />
          <input
            className={inputClass}
            name='chapterId'
            defaultValue={selected.chapterId}
            placeholder={t('operations.reference.chapterId')}
            required
          />
          <input
            className={inputClass}
            name='chapterNameId'
            defaultValue={selected.chapterNameId}
            placeholder={t('operations.reference.chapterNameId')}
          />
          <LoadButton label={t('operations.reference.load')} />
        </Form>
        <DatasetGrid data={chapterData} />
      </Panel>

      <div className='grid gap-6 xl:grid-cols-2'>
        <Panel icon={Database} title={t('operations.reference.ranking')} description={t('operations.reference.rankingHelp')}>
          <Form method='get' className='grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]'>
            <input type='hidden' name='returnTo' value={returnTo} />
            <select className={inputClass} name='surveyPeriodId' defaultValue={selected.surveyPeriodId} required>
              <option value=''>{t('operations.reference.selectPeriod')}</option>
              {periods.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.issueNumber ?? t('common.notAvailable')} ·{' '}
                  {item.status
                    ? t(`operations.surveyStatuses.${item.status}`, {
                        defaultValue: t('common.notAvailable')
                      })
                    : t('common.notAvailable')}
                </option>
              ))}
            </select>
            <LoadButton label={t('operations.reference.load')} />
          </Form>
          <DatasetGrid data={rankingData} />
        </Panel>
        <Panel icon={Library} title={t('operations.reference.directories')} description={t('operations.reference.directoriesHelp')}>
          <DatasetGrid data={directories} />
        </Panel>
      </div>
    </div>
  )
}

function MagazineAdminPanel({
  magazines,
  onEdit
}: {
  magazines: MagazineListResDtoOutputItemsItem[]
  onEdit: (magazine: MagazineListResDtoOutputItemsItem) => void
}) {
  const { t } = useTranslation('admin')
  return (
    <section className='overflow-hidden rounded-lg border border-border bg-card shadow-sm'>
      <header className='flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4'>
        <div className='min-w-0'>
          <h2 className='text-sm font-bold text-foreground'>{t('operations.reference.registeredMagazines')}</h2>
          <p className='mt-1 text-xs text-muted-foreground'>{t('operations.reference.directoryHint')}</p>
        </div>
        <span className='rounded-md bg-muted px-2 py-1 text-[11px] font-bold text-muted-foreground'>
          {t('operations.reference.magazineTotal', { count: magazines.length })}
        </span>
      </header>
      <div>
        {magazines.map((magazine) => (
          <MagazineDirectoryRow key={magazine.name} magazine={magazine} onEdit={() => onEdit(magazine)} />
        ))}
        {!magazines.length && (
          <p className='p-5 text-xs text-muted-foreground'>{t('operations.reference.emptyMagazines')}</p>
        )}
      </div>
    </section>
  )
}

function MagazineDirectoryRow({
  magazine,
  onEdit
}: {
  magazine: MagazineListResDtoOutputItemsItem
  onEdit: () => void
}) {
  const { t } = useTranslation('admin')
  const fetcher = useFetcher<AdminReferenceActionResult>()
  return (
    <article className='flex flex-col gap-3 border-b border-border px-5 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between'>
      <div className='min-w-0'>
        <h3 className='break-words text-sm font-bold text-foreground'>{magazine.name}</h3>
        <div className='mt-2 flex flex-wrap gap-1.5'>
          {magazine.publicationTypes.map((item) => (
            <span
              key={item}
              className='rounded-md bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary'
            >
              {t(`operations.publicationTypes.${item}`, { defaultValue: item })}
            </span>
          ))}
        </div>
      </div>
      <div className='grid shrink-0 gap-2 sm:flex sm:flex-wrap'>
        <button
          type='button'
          onClick={onEdit}
          className={`${modalButtonClass} gap-2 border border-border bg-card text-foreground hover:bg-muted`}
        >
          <Pencil className='size-4 text-primary' />
          {t('operations.reference.editMagazine')}
        </button>
        <fetcher.Form method='post'>
          <input type='hidden' name='intent' value='deleteMagazine' />
          <input type='hidden' name='name' value={magazine.name} />
          <button
            disabled={fetcher.state !== 'idle'}
            className={`${modalButtonClass} gap-2 border border-destructive/30 bg-destructive/10 text-destructive disabled:opacity-50`}
          >
            <Trash2 className='size-4' />
            {t('operations.reference.deleteMagazine')}
          </button>
        </fetcher.Form>
      </div>
      <ActionFeedback data={fetcher.data} />
    </article>
  )
}

function AddMagazineDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('admin')
  const fetcher = useFetcher<AdminReferenceActionResult>()

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.ok) onClose()
  }, [fetcher.data, fetcher.state, onClose])

  return (
    <Dialog
      compact
      open
      onClose={onClose}
      titleId='admin-add-magazine'
      title={t('operations.reference.addMagazine')}
      description={t('operations.reference.addMagazineHelp')}
      size='md'
    >
      <fetcher.Form method='post' className='grid gap-4'>
        <input type='hidden' name='intent' value='createMagazine' />
        <label className={referenceFieldClass}>
          <span className={referenceFieldLabelClass}>{t('operations.reference.magazineName')}</span>
          <input className={inputClass} name='name' required />
        </label>
        <FieldGroup label={t('operations.reference.publicationTypes')}>
          <PublicationTypeChecks publicationTypes={PUBLICATION_TYPES} defaultValues={['WEEKLY']} />
        </FieldGroup>
        <ModalActions
          cancelLabel={t('common.cancel')}
          submitLabel={t('operations.reference.saveMagazine')}
          busy={fetcher.state !== 'idle'}
          onCancel={onClose}
        />
        <ActionFeedback data={fetcher.data} />
      </fetcher.Form>
    </Dialog>
  )
}

function EditMagazineDialog({
  magazine,
  onClose
}: {
  magazine: MagazineListResDtoOutputItemsItem
  onClose: () => void
}) {
  const { t } = useTranslation('admin')
  const fetcher = useFetcher<AdminReferenceActionResult>()

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.ok) onClose()
  }, [fetcher.data, fetcher.state, onClose])

  return (
    <Dialog
      compact
      open
      onClose={onClose}
      titleId='admin-edit-magazine'
      title={t('operations.reference.editMagazineTitle', { name: magazine.name })}
      description={t('operations.reference.editMagazineHelp')}
      size='md'
    >
      <fetcher.Form method='post' className='grid gap-4'>
        <input type='hidden' name='intent' value='updateMagazine' />
        <input type='hidden' name='name' value={magazine.name} />
        <FieldGroup label={t('operations.reference.publicationTypes')}>
          <PublicationTypeChecks publicationTypes={PUBLICATION_TYPES} defaultValues={magazine.publicationTypes} />
        </FieldGroup>
        <ModalActions
          cancelLabel={t('common.cancel')}
          submitLabel={t('operations.reference.updateMagazine')}
          busy={fetcher.state !== 'idle'}
          onCancel={onClose}
        />
        <ActionFeedback data={fetcher.data} />
      </fetcher.Form>
    </Dialog>
  )
}

function UpdateSeriesSlotDialog({
  magazines,
  series,
  onClose
}: {
  magazines: MagazineListResDtoOutputItemsItem[]
  series: SelectItem[]
  onClose: () => void
}) {
  const { t } = useTranslation('admin')
  const fetcher = useFetcher<AdminReferenceActionResult>()
  const firstMagazine = magazines[0]
  const [slotMagazine, setSlotMagazine] = useState(firstMagazine?.name ?? '')
  const slotPublicationTypes = magazines.find((item) => item.name === slotMagazine)?.publicationTypes ?? []
  const [slotPublicationType, setSlotPublicationType] = useState<string>(slotPublicationTypes[0] ?? '')

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.ok) onClose()
  }, [fetcher.data, fetcher.state, onClose])

  return (
    <Dialog
      compact
      open
      onClose={onClose}
      titleId='admin-update-series-slot'
      title={t('operations.reference.updateSeriesSlot')}
      description={t('operations.reference.updateSeriesSlotHelp')}
      size='md'
    >
      <fetcher.Form method='post' className='grid gap-4'>
        <input type='hidden' name='intent' value='updateSeriesSlot' />
        <label className={referenceFieldClass}>
          <span className={referenceFieldLabelClass}>{t('operations.reference.selectSeries')}</span>
          <select className={inputClass} name='seriesId' required>
            <option value=''>{t('operations.reference.selectSeries')}</option>
            {series.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title ?? item.id}
              </option>
            ))}
          </select>
        </label>
        <label className={referenceFieldClass}>
          <span className={referenceFieldLabelClass}>{t('operations.reference.selectMagazine')}</span>
          <select
            className={inputClass}
            name='magazine'
            required
            value={slotMagazine}
            onChange={(event) => {
              const nextMagazine = event.target.value
              const nextTypes = magazines.find((item) => item.name === nextMagazine)?.publicationTypes ?? []
              setSlotMagazine(nextMagazine)
              setSlotPublicationType(nextTypes[0] ?? '')
            }}
          >
            <option value='' disabled>
              {t('operations.reference.selectMagazine')}
            </option>
            {magazines.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <div className='grid gap-3 sm:grid-cols-2'>
          <label className={referenceFieldClass}>
            <span className={referenceFieldLabelClass}>{t('operations.reference.startIssueNumber')}</span>
            <input className={inputClass} name='startIssueNumber' type='number' min={1} required />
          </label>
          <label className={referenceFieldClass}>
            <span className={referenceFieldLabelClass}>{t('operations.reference.selectPublicationType')}</span>
            <select
              className={inputClass}
              name='publicationType'
              required
              value={slotPublicationType}
              disabled={!slotPublicationTypes.length}
              onChange={(event) => setSlotPublicationType(event.target.value)}
            >
              {!slotPublicationType && (
                <option value='' disabled>
                  {t('operations.reference.selectPublicationType')}
                </option>
              )}
              {slotPublicationTypes.map((item) => (
                <option key={item} value={item}>
                  {t(`operations.publicationTypes.${item}`, { defaultValue: item })}
                </option>
              ))}
            </select>
          </label>
        </div>
        <ModalActions
          cancelLabel={t('common.cancel')}
          submitLabel={t('operations.reference.saveSeriesSlot')}
          busy={fetcher.state !== 'idle'}
          onCancel={onClose}
        />
        <ActionFeedback data={fetcher.data} />
      </fetcher.Form>
    </Dialog>
  )
}

function FieldGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <fieldset className='grid gap-2'>
      <legend className='text-xs font-semibold'>{label}</legend>
      {children}
    </fieldset>
  )
}

function ModalActions({
  cancelLabel,
  submitLabel,
  busy,
  onCancel
}: {
  cancelLabel: string
  submitLabel: string
  busy: boolean
  onCancel: () => void
}) {
  return (
    <div className='flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end'>
      <button type='button' onClick={onCancel} className={`${modalButtonClass} border border-border`}>
        {cancelLabel}
      </button>
      <button disabled={busy} className={`${modalButtonClass} bg-primary text-primary-foreground disabled:opacity-50`}>
        {submitLabel}
      </button>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LegacyMagazineAdminPanel({
  magazines,
  series
}: {
  magazines: MagazineListResDtoOutputItemsItem[]
  series: SelectItem[]
}) {
  const { t } = useTranslation('admin')
  const createFetcher = useFetcher<AdminReferenceActionResult>()
  const slotFetcher = useFetcher<AdminReferenceActionResult>()
  const publicationTypes = ['WEEKLY', 'MONTHLY', 'IRREGULAR'] as const
  const firstMagazine = magazines[0]
  const [slotMagazine, setSlotMagazine] = useState(firstMagazine?.name ?? '')
  const slotPublicationTypes = magazines.find((item) => item.name === slotMagazine)?.publicationTypes ?? []
  const [slotPublicationType, setSlotPublicationType] = useState<string>(slotPublicationTypes[0] ?? '')

  return (
    <Panel icon={Library} title={t('operations.reference.magazines')} description={t('operations.reference.magazinesHelp')}>
      <div className='grid gap-4 xl:grid-cols-2'>
        <section className='rounded-lg border border-border bg-muted/30 p-4'>
          <div>
            <h3 className='text-sm font-bold text-foreground'>{t('operations.reference.addMagazine')}</h3>
            <p className='mt-1 text-xs leading-5 text-muted-foreground'>
              {t('operations.reference.addMagazineHelp')}
            </p>
          </div>
          <createFetcher.Form method='post' className='mt-3 grid gap-3'>
            <input type='hidden' name='intent' value='createMagazine' />
            <input className={inputClass} name='name' placeholder={t('operations.reference.magazineName')} required />
            <PublicationTypeChecks publicationTypes={publicationTypes} defaultValues={['WEEKLY']} />
            <SubmitButton label={t('operations.reference.saveMagazine')} busy={createFetcher.state !== 'idle'} />
          </createFetcher.Form>
          <ActionFeedback data={createFetcher.data} />
        </section>
        <section className='rounded-lg border border-border bg-muted/30 p-4'>
          <div>
            <h3 className='text-sm font-bold text-foreground'>{t('operations.reference.updateSeriesSlot')}</h3>
            <p className='mt-1 text-xs leading-5 text-muted-foreground'>
              {t('operations.reference.updateSeriesSlotHelp')}
            </p>
          </div>
          <slotFetcher.Form method='post' className='mt-3 grid gap-3'>
            <input type='hidden' name='intent' value='updateSeriesSlot' />
            <select className={inputClass} name='seriesId' required>
              <option value=''>{t('operations.reference.selectSeries')}</option>
              {series.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title ?? item.id}
                </option>
              ))}
            </select>
            <select
              className={inputClass}
              name='magazine'
              required
              value={slotMagazine}
              onChange={(event) => {
                const nextMagazine = event.target.value
                const nextTypes = magazines.find((item) => item.name === nextMagazine)?.publicationTypes ?? []
                setSlotMagazine(nextMagazine)
                setSlotPublicationType(nextTypes[0] ?? '')
              }}
            >
              <option value='' disabled>
                {t('operations.reference.selectMagazine')}
              </option>
              {magazines.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
            <div className='grid gap-3 sm:grid-cols-2'>
              <input
                className={inputClass}
                name='startIssueNumber'
                type='number'
                min={1}
                placeholder={t('operations.reference.startIssueNumber')}
                required
              />
              <select
                className={inputClass}
                name='publicationType'
                required
                value={slotPublicationType}
                disabled={!slotPublicationTypes.length}
                onChange={(event) => setSlotPublicationType(event.target.value)}
              >
                {!slotPublicationType && (
                  <option value='' disabled>
                    {t('operations.reference.selectPublicationType')}
                  </option>
                )}
                {slotPublicationTypes.map((item) => (
                  <option key={item} value={item}>
                    {t(`operations.publicationTypes.${item}`, { defaultValue: item })}
                  </option>
                ))}
              </select>
            </div>
            <SubmitButton label={t('operations.reference.saveSeriesSlot')} busy={slotFetcher.state !== 'idle'} />
          </slotFetcher.Form>
          <ActionFeedback data={slotFetcher.data} />
        </section>
      </div>
      <div className='mt-5'>
        <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
          <h3 className='text-sm font-bold text-foreground'>{t('operations.reference.registeredMagazines')}</h3>
          <span className='rounded-md bg-muted px-2 py-1 text-[11px] font-bold text-muted-foreground'>
            {t('operations.reference.magazineTotal', { count: magazines.length })}
          </span>
        </div>
        <div className='grid gap-3 lg:grid-cols-2'>
          {magazines.map((magazine) => (
            <MagazineRow key={magazine.name} magazine={magazine} />
          ))}
          {!magazines.length && (
            <p className='rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground'>
              {t('operations.reference.emptyMagazines')}
            </p>
          )}
        </div>
      </div>
    </Panel>
  )
}

function MagazineRow({ magazine }: { magazine: MagazineListResDtoOutputItemsItem }) {
  const { t } = useTranslation('admin')
  const fetcher = useFetcher<AdminReferenceActionResult>()
  const publicationTypes = ['WEEKLY', 'MONTHLY', 'IRREGULAR'] as const

  return (
    <article className='rounded-lg border border-border p-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h3 className='font-bold text-foreground'>{magazine.name}</h3>
          <p className='mt-1 text-xs text-muted-foreground'>
            {magazine.publicationTypes.map((item) => t(`operations.publicationTypes.${item}`, { defaultValue: item })).join(' · ')}
          </p>
        </div>
        <fetcher.Form method='post'>
          <input type='hidden' name='intent' value='deleteMagazine' />
          <input type='hidden' name='name' value={magazine.name} />
          <button
            disabled={fetcher.state !== 'idle'}
            className={`${modalButtonClass} border border-destructive/40 text-destructive disabled:opacity-50`}
          >
            {t('operations.reference.deleteMagazine')}
          </button>
        </fetcher.Form>
      </div>
      <fetcher.Form method='post' className='mt-3 grid gap-3'>
        <input type='hidden' name='intent' value='updateMagazine' />
        <input type='hidden' name='name' value={magazine.name} />
        <PublicationTypeChecks publicationTypes={publicationTypes} defaultValues={magazine.publicationTypes} />
        <SubmitButton label={t('operations.reference.updateMagazine')} busy={fetcher.state !== 'idle'} />
      </fetcher.Form>
      <ActionFeedback data={fetcher.data} />
    </article>
  )
}

function PublicationTypeChecks({
  publicationTypes,
  defaultValues
}: {
  publicationTypes: readonly ('WEEKLY' | 'MONTHLY' | 'IRREGULAR')[]
  defaultValues: readonly string[]
}) {
  const { t } = useTranslation('admin')
  return (
    <div className='grid gap-2 sm:grid-cols-3'>
      {publicationTypes.map((item) => (
        <label key={item} className='flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs'>
          <input
            type='checkbox'
            name='publicationTypes'
            value={item}
            defaultChecked={defaultValues.includes(item)}
            className='size-4 accent-primary'
          />
          <span>{t(`operations.publicationTypes.${item}`, { defaultValue: item })}</span>
        </label>
      ))}
    </div>
  )
}

function SubmitButton({ label, busy }: { label: string; busy: boolean }) {
  return (
    <button disabled={busy} className={`${modalButtonClass} bg-primary text-primary-foreground disabled:opacity-50`}>
      {label}
    </button>
  )
}

function ActionFeedback({ data }: { data?: AdminReferenceActionResult }) {
  const { t } = useTranslation('admin')
  if (!data) return null
  const message = data.message ?? (data.ok ? t(`operations.reference.messages.${data.intent}`) : '')
  if (!message) return null
  return (
    <p className={data.ok ? 'mt-3 text-xs font-semibold text-primary' : 'mt-3 text-xs font-semibold text-destructive'}>
      {message}
    </p>
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

function DatasetGrid({ data }: { data: Record<string, unknown> }) {
  const { t } = useTranslation('admin')
  const entries = Object.entries(data).filter(([, value]) => value !== null)
  if (!entries.length) return null
  return (
    <div className='mt-4 grid gap-3 lg:grid-cols-2'>
      {entries.map(([key, value]) => (
        <section key={key} className='min-w-0 rounded-lg border border-border p-4'>
          <h3 className='mb-3 text-xs font-bold text-foreground'>
            {t(`operations.reference.datasets.${key}`, { defaultValue: t('common.data') })}
          </h3>
          <BusinessDataView value={value} />
        </section>
      ))}
    </div>
  )
}
