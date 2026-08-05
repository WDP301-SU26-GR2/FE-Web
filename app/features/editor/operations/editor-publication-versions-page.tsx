import { useState } from 'react'
import { PencilLine, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { PublicationVersionListResDtoOutputItemsItem } from '~/api/model/publication-versions'
import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import { Dialog } from '~/shared/ui/dialog'
import {
  OperationAction,
  OperationFeedback,
  OperationsLayout,
  SeriesSelect,
  operationInput,
  useOperationFetcher
} from './components/operations-shared'

export function EditorPublicationVersionsPage({
  series,
  versions,
  focusSeriesId,
  hasError,
  backPath = '/dashboard/editor/operations'
}: {
  series: SeriesListResDtoOutputItemsItem[]
  versions: PublicationVersionListResDtoOutputItemsItem[]
  focusSeriesId: string
  hasError: boolean
  backPath?: string
}) {
  const { t } = useTranslation('editor')
  const fetcher = useOperationFetcher()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null)

  return (
    <OperationsLayout
      titleKey='operations.versions'
      descriptionKey='operations.descriptions.versions'
      hasError={hasError}
      backPath={backPath}
    >
      <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
        <form method='get' className='grid gap-3 sm:grid-cols-[1fr_auto_auto]'>
          <SeriesSelect series={series} defaultValue={focusSeriesId} required={false} />
          <button className='rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground'>
            {t('actions.load')}
          </button>
          <button
            type='button'
            onClick={() => {
              setEditingVersionId(null)
              setShowCreateDialog(true)
            }}
            className='inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-xs font-bold text-foreground'
          >
            <Plus className='size-4' />
            {t('actions.createVersion')}
          </button>
        </form>

        <div className='mt-4 space-y-2'>
          {versions.map((item) => {
            const isEditing = editingVersionId === item.id
            return (
              <article key={item.id} className='rounded-lg border border-border p-3'>
                <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
                  <div>
                    <strong>
                      {t(`operations.languages.${item.language}`, { defaultValue: t('common.notAvailable') })} ·{' '}
                      {item.versionType
                        ? t(`operations.versionTypes.${item.versionType}`, {
                            defaultValue: t('common.notAvailable')
                          })
                        : '—'}
                    </strong>
                    <p className='text-xs text-muted-foreground'>
                      {t(`operations.readingDirections.${item.readingDirection}`, {
                        defaultValue: t('common.notAvailable')
                      })}
                      {item.notes ? ` · ${item.notes}` : ''}
                    </p>
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    <button
                      type='button'
                      onClick={() => {
                        setEditingVersionId(item.id)
                        setShowCreateDialog(false)
                      }}
                      className='inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-bold text-foreground'
                    >
                      <PencilLine className='size-3.5' />
                      {t('actions.updateVersion')}
                    </button>
                    <fetcher.Form method='post' className='inline-flex'>
                      <input type='hidden' name='versionId' value={item.id} />
                      <OperationAction intent='removePublicationVersion' label={t('actions.remove')} destructive />
                    </fetcher.Form>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <Dialog
        open={showCreateDialog || editingVersionId !== null}
        onClose={() => {
          setShowCreateDialog(false)
          setEditingVersionId(null)
        }}
        titleId='publication-version-dialog-title'
        title={editingVersionId ? t('operations.updateVersionSection') : t('operations.createVersionSection')}
        size='lg'
        compact
      >
        {editingVersionId ? (
          <fetcher.Form method='post' className='grid gap-3 sm:grid-cols-2'>
            <input type='hidden' name='versionId' value={editingVersionId} />
            <input name='language' className={operationInput} placeholder='JA / EN / VI' />
            <select name='readingDirection' className={operationInput} defaultValue=''>
              <option value=''>{t('operations.keepCurrent')}</option>
              <option value='__CLEAR__'>{t('actions.clearValue')}</option>
              <option value='RTL'>{t('operations.readingDirections.RTL')}</option>
              <option value='LTR'>{t('operations.readingDirections.LTR')}</option>
            </select>
            <select name='versionType' className={operationInput} defaultValue=''>
              <option value=''>{t('operations.keepCurrent')}</option>
              <option value='__CLEAR__'>{t('actions.clearValue')}</option>
              {['ORIGINAL', 'DIGITAL', 'FLIPPED'].map((value) => (
                <option key={value} value={value}>
                  {t(`operations.versionTypes.${value}`)}
                </option>
              ))}
            </select>
            <input name='notes' className={`${operationInput} sm:col-span-2`} placeholder={t('operations.notes')} />
            <label className='flex items-center gap-2 text-xs text-muted-foreground'>
              <input type='checkbox' name='clearLanguage' />
              {t('operations.clearLanguage')}
            </label>
            <label className='flex items-center gap-2 text-xs text-muted-foreground'>
              <input type='checkbox' name='clearNotes' />
              {t('operations.clearNotes')}
            </label>
            <div className='grid grid-cols-2 gap-2 sm:col-span-2'>
              <OperationAction intent='updatePublicationVersion' label={t('actions.updateVersion')} />
              <button
                type='button'
                onClick={() => {
                  setEditingVersionId(null)
                  setShowCreateDialog(false)
                }}
                className='inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-bold text-foreground'
              >
                {t('actions.cancel')}
              </button>
            </div>
          </fetcher.Form>
        ) : (
          <fetcher.Form method='post' className='grid gap-3'>
            <SeriesSelect series={series} />
            <select name='language' required className={operationInput}>
              <option value=''>{t('operations.selectLanguage')}</option>
              <option value='JA'>{t('operations.languages.JA')}</option>
              <option value='EN'>{t('operations.languages.EN')}</option>
              <option value='VI'>{t('operations.languages.VI')}</option>
            </select>
            <select name='readingDirection' className={operationInput}>
              <option value='RTL'>{t('operations.readingDirections.RTL')}</option>
              <option value='LTR'>{t('operations.readingDirections.LTR')}</option>
            </select>
            <select name='versionType' className={operationInput}>
              {['ORIGINAL', 'DIGITAL', 'FLIPPED'].map((value) => (
                <option key={value} value={value}>
                  {t(`operations.versionTypes.${value}`)}
                </option>
              ))}
            </select>
            <input name='notes' className={operationInput} placeholder={t('operations.notes')} />
            <div className='flex justify-end gap-2'>
              <OperationAction intent='createPublicationVersion' label={t('actions.createVersion')} />
            </div>
          </fetcher.Form>
        )}
        <OperationFeedback data={fetcher.data} />
      </Dialog>
    </OperationsLayout>
  )
}
