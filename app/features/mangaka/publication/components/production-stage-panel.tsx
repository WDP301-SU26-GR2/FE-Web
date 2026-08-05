import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronRight, Loader2, Pencil, Plus, RotateCcw, Trash2, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  productionStageControllerComplete,
  productionStageControllerConfirmOutputs,
  productionStageControllerList,
  productionStageControllerListPages,
  productionStageControllerReopen
} from '~/api/operations/production-stages/production-stages'
import type { StageListResDtoOutputStagesItem, StagePageListResDtoOutputItemsItem } from '~/api/model/production-stages'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'
import { uploadToR2WithMessage } from '~/shared/lib/upload/upload-to-r2'
import { Button } from '~/shared/ui'
import { Dialog } from '~/shared/ui/dialog'
import { cn } from '~/shared/lib/cn'

import { ProductionStageManagementDialog } from './production-stage-management-dialog'
import { translateProductionStageName } from '../lib/translate-publication-status'
import { useProductionStageManagement } from '../hooks/use-production-stage-management'

export interface ProductionStagePanelProps {
  chapterId: string
  manuscriptStatus: string | null | undefined
  onChanged: () => void
  onReadinessChange: (ready: boolean) => void
  onPageSetLockChange: (locked: boolean) => void
}

type OutputChoice = { reuseInput: boolean; file?: File; existingOutput?: string | null }

/**
 * The stage gate for a chapter. Tasks are only created through the active
 * stage, then every page output is explicitly confirmed before the stage can
 * advance. This intentionally makes the production sequence visible instead
 * of treating task approval as the manuscript-submit gate.
 */
export function ProductionStagePanel({
  chapterId,
  manuscriptStatus,
  onChanged,
  onReadinessChange,
  onPageSetLockChange
}: ProductionStagePanelProps) {
  const { t } = useTranslation('mangaka')
  const [stages, setStages] = useState<StageListResDtoOutputStagesItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [outputStage, setOutputStage] = useState<StageListResDtoOutputStagesItem | null>(null)
  const [managementTarget, setManagementTarget] = useState<{
    mode: 'create' | 'edit' | 'remove'
    stage: StageListResDtoOutputStagesItem
  } | null>(null)
  const [outputsLocked, setOutputsLocked] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await productionStageControllerList({ id: chapterId })
      const nextStages = response.data.stages ?? []
      setStages(nextStages)
      const current = nextStages.find((stage) => stage.status === 'ACTIVE')
      const pageSetLocked = nextStages.length > 0 && nextStages[0]?.status !== 'ACTIVE'
      let areOutputsLocked = current?.isFinalCheck === true
      if (current && !current.isFinalCheck) {
        const stagePages = await productionStageControllerListPages({ id: chapterId, stageId: current.id })
        const pages = stagePages.data.items ?? []
        areOutputsLocked = pages.length > 0 && pages.every((page) => page.outputReady)
      }
      setOutputsLocked(areOutputsLocked)
      onPageSetLockChange(pageSetLocked)
      onReadinessChange(nextStages.length === 0 || current?.isFinalCheck === true)
    } catch (cause) {
      setError(extractApiErrorMessage(cause, t('seriesDetail.production.error')))
      setOutputsLocked(false)
      onPageSetLockChange(true)
      onReadinessChange(false)
    } finally {
      setLoading(false)
    }
  }, [chapterId, onPageSetLockChange, onReadinessChange, t])

  useEffect(() => {
    // The request updates local loading/data state after it resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
  }, [refresh])

  const activeStage = stages.find((stage) => stage.status === 'ACTIVE') ?? null
  const canReopen = manuscriptStatus === 'EDITOR_REVISION'
  const onStagesChanged = useCallback(() => {
    void refresh()
    onChanged()
  }, [onChanged, refresh])
  const management = useProductionStageManagement(chapterId, onStagesChanged)

  const completeStage = async (stage: StageListResDtoOutputStagesItem) => {
    setActiveAction(`complete:${stage.id}`)
    try {
      await productionStageControllerComplete({ id: chapterId, stageId: stage.id })
      toast.success(t('seriesDetail.production.completeSuccess'))
      await refresh()
      onChanged()
    } catch (cause) {
      toast.error(extractApiErrorMessage(cause, t('seriesDetail.production.error')))
    } finally {
      setActiveAction(null)
    }
  }

  const reopenStage = async (stage: StageListResDtoOutputStagesItem) => {
    setActiveAction(`reopen:${stage.id}`)
    try {
      await productionStageControllerReopen({ id: chapterId, stageId: stage.id })
      toast.success(t('seriesDetail.production.reopenSuccess'))
      await refresh()
      onChanged()
    } catch (cause) {
      toast.error(extractApiErrorMessage(cause, t('seriesDetail.production.error')))
    } finally {
      setActiveAction(null)
    }
  }

  if (loading) {
    return (
      <div className='flex items-center gap-2 border-t border-border px-5 py-3 text-xs text-muted-foreground'>
        <Loader2 className='h-3.5 w-3.5 animate-spin' />
        {t('seriesDetail.production.loading')}
      </div>
    )
  }
  if (error) {
    return (
      <div className='border-t border-destructive/30 bg-destructive/10 px-5 py-3 text-xs text-destructive'>{error}</div>
    )
  }
  if (stages.length === 0) return null

  return (
    <section className='border-t border-border bg-card'>
      <header className='flex flex-wrap items-center justify-between gap-2 px-5 py-3'>
        <div>
          <p className='text-[10px] font-bold uppercase tracking-widest text-muted-foreground'>
            {t('seriesDetail.production.label')}
          </p>
          <p className='mt-0.5 text-xs text-muted-foreground'>{t('seriesDetail.production.description')}</p>
        </div>
        {activeStage && (
          <span className='rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary'>
            {t('seriesDetail.production.active', { name: translateProductionStageName(activeStage.name, t) })}
          </span>
        )}
      </header>

      <ol className='grid gap-px border-y border-border bg-border md:grid-cols-4'>
        {stages.map((stage) => (
          <li key={stage.id} className={cn('min-w-0 bg-card px-3 py-3', stage.status === 'ACTIVE' && 'bg-primary/5')}>
            <div className='flex items-center justify-between gap-2'>
              <span className='text-[10px] font-bold uppercase tracking-widest text-muted-foreground'>
                {t('seriesDetail.production.stageNumber', { n: stage.order })}
              </span>
              <StageStatus status={stage.status} />
            </div>
            <p className='mt-1 truncate text-sm font-semibold'>{translateProductionStageName(stage.name, t)}</p>
            <div className='mt-1 flex flex-wrap gap-2 text-[11px] font-semibold'>
              {stage.status !== 'COMPLETED' && (
                <button
                  type='button'
                  disabled={management.isMutating}
                  onClick={() => setManagementTarget({ mode: 'edit', stage })}
                  className='inline-flex items-center gap-1 text-primary hover:underline disabled:opacity-50'
                >
                  <Pencil className='h-3 w-3' />
                  {t('seriesDetail.production.management.edit.action')}
                </button>
              )}
              {(stage.status === 'ACTIVE' || stage.status === 'LOCKED') && !stage.isFinalCheck && (
                <button
                  type='button'
                  disabled={management.isMutating}
                  onClick={() => setManagementTarget({ mode: 'create', stage })}
                  className='inline-flex items-center gap-1 text-primary hover:underline disabled:opacity-50'
                >
                  <Plus className='h-3 w-3' />
                  {t('seriesDetail.production.management.create.action')}
                </button>
              )}
              {stage.status === 'LOCKED' && !stage.isFinalCheck && stage.analytics.taskCount === 0 && (
                <button
                  type='button'
                  disabled={management.isMutating}
                  onClick={() => setManagementTarget({ mode: 'remove', stage })}
                  className='inline-flex items-center gap-1 text-destructive hover:underline disabled:opacity-50'
                >
                  <Trash2 className='h-3 w-3' />
                  {t('seriesDetail.production.management.remove.action')}
                </button>
              )}
            </div>
            <p className='mt-1 text-[11px] text-muted-foreground'>
              {t('seriesDetail.production.taskCount', {
                open: stage.analytics.openCount,
                approved: stage.analytics.approvedCount
              })}
            </p>
            {stage.taskTypes.length > 0 && (
              <div className='mt-2 flex flex-wrap gap-1' aria-label={t('tasks.composer.taskType')}>
                {stage.taskTypes.map((taskType) => (
                  <span
                    key={taskType}
                    className='rounded border border-border bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground'
                  >
                    {t(`tasks.composer.taskTypeEnum.${taskType}`, taskType)}
                  </span>
                ))}
              </div>
            )}
            {canReopen && stage.status === 'COMPLETED' && !stage.isFinalCheck && (
              <button
                type='button'
                disabled={activeAction !== null}
                onClick={() => void reopenStage(stage)}
                className='mt-2 flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline disabled:opacity-50'
              >
                {activeAction === `reopen:${stage.id}` ? (
                  <Loader2 className='h-3 w-3 animate-spin' />
                ) : (
                  <RotateCcw className='h-3 w-3' />
                )}
                {t('seriesDetail.production.reopen')}
              </button>
            )}
          </li>
        ))}
      </ol>

      {activeStage && !activeStage.isFinalCheck && (
        <div className='flex flex-wrap justify-end gap-3 px-5 py-3'>
          <div className='flex flex-wrap gap-2'>
            <Button size='sm' variant='secondary' disabled={outputsLocked} onClick={() => setOutputStage(activeStage)}>
              <Upload className='mr-1.5 h-3.5 w-3.5' />
              {outputsLocked ? t('seriesDetail.production.outputsLocked') : t('seriesDetail.production.confirmOutputs')}
            </Button>
            <Button
              size='sm'
              onClick={() => void completeStage(activeStage)}
              disabled={activeAction !== null || !outputsLocked}
            >
              {activeAction === `complete:${activeStage.id}` ? (
                <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
              ) : (
                <ChevronRight className='mr-1.5 h-3.5 w-3.5' />
              )}
              {t('seriesDetail.production.complete')}
            </Button>
          </div>
        </div>
      )}

      {outputStage && (
        <ConfirmOutputsDialog
          chapterId={chapterId}
          stage={outputStage}
          onClose={() => setOutputStage(null)}
          onConfirmed={async () => {
            setOutputStage(null)
            await refresh()
            onChanged()
          }}
        />
      )}
      {managementTarget && (
        <ProductionStageManagementDialog
          key={`${managementTarget.mode}:${managementTarget.stage.id}`}
          mode={managementTarget.mode}
          stage={managementTarget.stage}
          management={management}
          onClose={() => setManagementTarget(null)}
        />
      )}
    </section>
  )
}

function StageStatus({ status }: { status: string }) {
  const { t } = useTranslation('mangaka')
  return (
    <span
      className={cn(
        'rounded-full px-1.5 py-0.5 text-[9px] font-bold',
        status === 'ACTIVE'
          ? 'bg-primary text-primary-foreground'
          : status === 'COMPLETED'
            ? 'bg-success/10 text-success'
            : 'bg-muted text-muted-foreground'
      )}
    >
      {t(`seriesDetail.production.status.${status}`)}
    </span>
  )
}

function ConfirmOutputsDialog({
  chapterId,
  stage,
  onClose,
  onConfirmed
}: {
  chapterId: string
  stage: StageListResDtoOutputStagesItem
  onClose: () => void
  onConfirmed: () => Promise<void>
}) {
  const { t } = useTranslation('mangaka')
  const [items, setItems] = useState<StagePageListResDtoOutputItemsItem[]>([])
  const [choices, setChoices] = useState<Record<string, OutputChoice>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})
  const previewUrlsRef = useRef<Record<string, string>>({})

  useEffect(() => {
    return () => {
      Object.values(previewUrlsRef.current).forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        const response = await productionStageControllerListPages({ id: chapterId, stageId: stage.id })
        const pages = response.data.items ?? []
        setItems(pages)
        setChoices(
          Object.fromEntries(
            pages.map((page) => [page.pageId, { reuseInput: !page.outputFileKey, existingOutput: page.outputFileKey }])
          )
        )
      } catch (cause) {
        toast.error(extractApiErrorMessage(cause, t('seriesDetail.production.error')))
      } finally {
        setLoading(false)
      }
    })()
  }, [chapterId, stage.id, t])

  const save = async () => {
    const hasMissingOutput = items.some((page) => {
      const choice = choices[page.pageId]
      return !choice?.file && !choice?.existingOutput && !choice?.reuseInput
    })
    if (hasMissingOutput) return

    setSaving(true)
    try {
      const outputItems = await Promise.all(
        items.map(async (page) => {
          const choice = choices[page.pageId]
          if (choice?.file) {
            const uploaded = await uploadToR2WithMessage(choice.file, t('seriesDetail.production.uploadFailed'))
            if (!uploaded.key) throw new Error(uploaded.error ?? t('seriesDetail.production.uploadFailed'))
            return { pageId: page.pageId, fileKey: uploaded.key }
          }
          // A preserved output key is deliberately echoed after reopening. Do not
          // replace it with reuseInput: true, which would roll the page back to
          // the previous stage's immutable input.
          if (choice?.existingOutput) return { pageId: page.pageId, fileKey: choice.existingOutput }
          return { pageId: page.pageId, reuseInput: true }
        })
      )
      await productionStageControllerConfirmOutputs({ id: chapterId, stageId: stage.id }, { items: outputItems })
      toast.success(t('seriesDetail.production.outputsSuccess'))
      await onConfirmed()
    } catch (cause) {
      toast.error(extractApiErrorMessage(cause, t('seriesDetail.production.error')))
    } finally {
      setSaving(false)
    }
  }

  const hasMissingOutput = items.some((page) => {
    const choice = choices[page.pageId]
    return !choice?.file && !choice?.existingOutput && !choice?.reuseInput
  })

  const closeOutputDialog = () => {
    if (confirmOpen) {
      setConfirmOpen(false)
      return
    }
    onClose()
  }

  const selectOutputFile = (pageId: string, file: File | undefined) => {
    const nextPreviews = { ...previewUrlsRef.current }
    const existingPreview = nextPreviews[pageId]
    if (existingPreview) URL.revokeObjectURL(existingPreview)

    if (file?.type.startsWith('image/')) {
      nextPreviews[pageId] = URL.createObjectURL(file)
    } else {
      delete nextPreviews[pageId]
    }
    previewUrlsRef.current = nextPreviews
    setPreviewUrls(nextPreviews)
    setChoices((old) => ({
      ...old,
      [pageId]: { ...old[pageId], file, reuseInput: false }
    }))
  }

  return (
    <Dialog
      open
      onClose={closeOutputDialog}
      titleId='confirm-stage-output-title'
      title={
        confirmOpen
          ? t('seriesDetail.production.outputDialog.confirmTitle')
          : t('seriesDetail.production.outputDialog.title', {
              name: translateProductionStageName(stage.name, t)
            })
      }
      description={
        confirmOpen
          ? t('seriesDetail.production.outputDialog.confirmDescription')
          : t('seriesDetail.production.outputDialog.description')
      }
      footer={
        confirmOpen ? (
          <div className='flex justify-end gap-2'>
            <Button size='sm' variant='ghost' onClick={() => setConfirmOpen(false)}>
              {t('publication.cancel')}
            </Button>
            <Button
              size='sm'
              onClick={() => {
                setConfirmOpen(false)
                void save()
              }}
            >
              {t('seriesDetail.production.outputDialog.confirmCta')}
            </Button>
          </div>
        ) : (
          <div className='flex justify-end gap-2'>
            <Button size='sm' variant='ghost' onClick={closeOutputDialog}>
              {t('publication.cancel')}
            </Button>
            <Button
              size='sm'
              disabled={loading || saving || items.length === 0 || hasMissingOutput}
              onClick={() => setConfirmOpen(true)}
            >
              {saving && <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />}
              {t('seriesDetail.production.confirmOutputs')}
            </Button>
          </div>
        )
      }
    >
      {confirmOpen ? (
        <p className='text-sm text-foreground'>{t('seriesDetail.production.outputDialog.confirmNotice')}</p>
      ) : (
        <div className='space-y-3'>
          {loading ? (
            <Loader2 className='mx-auto h-5 w-5 animate-spin text-muted-foreground' />
          ) : (
            items.map((page) => {
              const choice = choices[page.pageId]
              return (
                <div key={page.pageId} className='rounded-md border border-border p-3'>
                  <p className='text-xs font-semibold'>
                    {t('seriesDetail.production.outputDialog.page', { id: page.pageId.slice(-6) })}
                  </p>
                  {choice?.existingOutput && (
                    <p className='mt-1 text-[11px] text-muted-foreground'>
                      {t('seriesDetail.production.outputDialog.preserve')}
                    </p>
                  )}
                  <div className='mt-2 flex flex-wrap items-center gap-2'>
                    <input
                      type='file'
                      accept='image/png,image/jpeg,image/webp'
                      onChange={(event) => selectOutputFile(page.pageId, event.target.files?.[0])}
                      className='max-w-full text-xs'
                    />
                    {choice?.file && previewUrls[page.pageId] && (
                      <div className='flex w-full items-center gap-3 rounded-md border border-border bg-muted/30 p-2'>
                        <img
                          src={previewUrls[page.pageId]}
                          alt={choice.file.name}
                          className='h-20 w-16 rounded border border-border object-cover'
                        />
                        <p className='min-w-0 truncate text-xs text-foreground'>{choice.file.name}</p>
                      </div>
                    )}
                    {!choice?.existingOutput && (
                      <label className='flex items-center gap-1 text-xs text-muted-foreground'>
                        <input
                          type='checkbox'
                          checked={choice?.reuseInput ?? true}
                          onChange={(event) =>
                            setChoices((old) => ({
                              ...old,
                              [page.pageId]: { ...old[page.pageId], reuseInput: event.target.checked }
                            }))
                          }
                        />
                        {t('seriesDetail.production.outputDialog.reuseInput')}
                      </label>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </Dialog>
  )
}
