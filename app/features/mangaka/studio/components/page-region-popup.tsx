import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Loader2, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '~/shared/ui'
import { Dialog } from '~/shared/ui/dialog'
import { cn } from '~/shared/lib/cn'
import type { RegionResDtoOutput } from '~/api/model/task'

import { usePageRegions } from '../hooks/use-page-regions'
import { usePageSegment, type ProposedRegion } from '../hooks/use-page-segment'
import {
  PageRegionCanvas,
  type CanvasMode,
  type PixelRect,
  type RegionType,
  type ProposedRegion as CanvasProposedRegion
} from './page-region-canvas'

export interface PageRegionPopupProps {
  /** Page id (required so the popup can list/create regions + run AI). */
  pageId: string | null
  /** Page display info (number etc.) for the header. */
  pageNumber: number
  /** R2 key for the page image. */
  pageImageKey: string | null | undefined
  /** Toggles one region in the parent task selection. */
  onPickRegion: (regionId: string) => void
  onClose: () => void
}

const REGION_TYPES: RegionType[] = ['PANEL', 'BACKGROUND', 'SPEECH_BUBBLE', 'SFX', 'CHARACTER']

/**
 * Modal that overlays the page image and lets the Mangaka:
 *  - **Draw** manual regions (drag-rectangle).
 *  - **Run AI** segmentation and preview proposals (dashed overlay), then
 *    `Apply` to persist them.
 *
 * The selected region can be toggled repeatedly before closing, so a task can
 * include multiple regions of the same page (`POST /tasks` → `regionIds[]`).
 */
export function PageRegionPopup({ pageId, pageNumber, pageImageKey, onPickRegion, onClose }: PageRegionPopupProps) {
  const { t } = useTranslation('mangaka')

  const [mode, setMode] = useState<CanvasMode>('view')
  const [regionType, setRegionType] = useState<RegionType>('PANEL')
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null)
  const [proposedType, setProposedType] = useState<RegionType>('PANEL')
  const [regionPendingDelete, setRegionPendingDelete] = useState<string | null>(null)

  const regions = usePageRegions(pageId)
  const segment = usePageSegment()

  // Esc closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleCommit = useCallback(
    async (rect: PixelRect) => {
      if (!pageId) return
      const created = await regions.createRegion({ regionType, coordinates: rect })
      if (created) {
        setSelectedRegionId(created.id)
        toast.success(t('studio.popup.toast.regionCreated'))
      }
    },
    [pageId, regions, regionType, t]
  )

  const handleApplyProposals = useCallback(async () => {
    if (!pageId) return
    const ok = await segment.apply(pageId)
    if (ok) {
      await regions.refresh()
      setMode('view')
    }
  }, [pageId, segment, regions])

  const handlePickSelected = useCallback(() => {
    if (!selectedRegionId) return
    onPickRegion(selectedRegionId)
  }, [selectedRegionId, onPickRegion])

  const handleStartSegment = useCallback(() => {
    if (!pageId) return
    setMode('preview')
    segment.startSegment(pageId, 'MODEL')
  }, [pageId, segment])

  const handleConfirmAiRegion = useCallback(
    async (regionId: string) => {
      await regions.confirmRegion(regionId)
      toast.success(t('studio.popup.toast.regionConfirmed'))
    },
    [regions, t]
  )

  if (!pageId) {
    return null
  }

  const isAiRunning = segment.status === 'QUEUED' || segment.status === 'RUNNING'

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-labelledby='page-region-popup-title'
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className='flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl'>
        {/* Header */}
        <header className='flex items-center justify-between gap-4 border-b border-border px-5 py-3'>
          <div className='flex items-center gap-3'>
            <h2 id='page-region-popup-title' className='text-base font-semibold text-foreground'>
              {t('studio.popup.title', { n: pageNumber })}
            </h2>
            <span className='text-sm text-muted-foreground'>
              {t('studio.popup.regionCount', { count: regions.regions.length })}
            </span>
          </div>
          <div className='flex items-center gap-2'>
            {/* Mode tabs */}
            <div className='flex overflow-hidden rounded-md border border-border bg-muted/40'>
              {(['view', 'draw'] as const).map((m) => (
                <button
                  key={m}
                  type='button'
                  onClick={() => setMode(m)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium transition',
                    mode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  {t(`studio.popup.mode.${m}`)}
                </button>
              ))}
            </div>
            <Button variant='secondary' size='sm' onClick={handleStartSegment} disabled={isAiRunning || !pageId}>
              {isAiRunning ? (
                <>
                  <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
                  {t('studio.popup.ai.running')}
                </>
              ) : (
                <>
                  <Sparkles className='mr-1.5 h-3.5 w-3.5' />
                  {t('studio.popup.ai.start')}
                </>
              )}
            </Button>
            <button
              type='button'
              onClick={onClose}
              aria-label={t('studio.popup.close')}
              className='rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground'
            >
              <X className='h-5 w-5' />
            </button>
          </div>
        </header>

        {/* Draw-mode toolbar */}
        {mode === 'draw' && (
          <div className='flex items-center gap-3 border-b border-border bg-muted/20 px-5 py-2 text-xs text-muted-foreground'>
            <span>{t('studio.popup.drawHint')}</span>
            <label className='ml-auto flex items-center gap-1.5'>
              <span className='font-medium text-foreground'>{t('studio.popup.regionType')}</span>
              <select
                value={regionType}
                onChange={(e) => setRegionType(e.target.value as RegionType)}
                className='rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground'
              >
                {REGION_TYPES.map((rt) => (
                  <option key={rt} value={rt}>
                    {t(`studio.popup.regionTypes.${rt}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {/* AI status banner */}
        {mode === 'preview' && (
          <div className='flex items-center justify-between border-b border-info/30 bg-info/10 px-5 py-2 text-xs text-info'>
            <span>
              {t('studio.popup.ai.status', {
                status: segment.status,
                count: segment.proposedRegions.length,
                duration: segment.durationMs ? Math.round(segment.durationMs / 1000) : '—'
              })}
            </span>
            <div className='flex items-center gap-2'>
              <label className='flex items-center gap-1.5'>
                <span className='font-medium'>{t('studio.popup.regionType')}</span>
                <select
                  value={proposedType}
                  onChange={(e) => setProposedType(e.target.value as RegionType)}
                  className='rounded-md border border-info/40 bg-background px-2 py-0.5 text-xs text-foreground'
                >
                  {REGION_TYPES.map((rt) => (
                    <option key={rt} value={rt}>
                      {t(`studio.popup.regionTypes.${rt}`)}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                size='sm'
                onClick={handleApplyProposals}
                disabled={segment.status !== 'SUCCEEDED' || segment.isApplying || segment.proposedRegions.length === 0}
              >
                {segment.isApplying ? <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' /> : null}
                {t('studio.popup.ai.apply')}
              </Button>
              <Button size='sm' variant='ghost' onClick={() => segment.reset()}>
                {t('studio.popup.ai.discard')}
              </Button>
            </div>
          </div>
        )}

        {/* Body */}
        <div className='flex flex-1 overflow-hidden'>
          {/* Left: region list */}
          <aside className='w-60 shrink-0 overflow-y-auto border-r border-border bg-muted/10 px-3 py-3'>
            <p className='mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
              {t('studio.popup.list.title')}
            </p>
            {regions.isLoading ? (
              <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
                {t('studio.popup.list.loading')}
              </div>
            ) : regions.regions.length === 0 ? (
              <p className='text-xs text-muted-foreground'>{t('studio.popup.list.empty')}</p>
            ) : (
              <ul className='space-y-1'>
                {regions.regions.map((r) => {
                  const aiUnconfirmed = r.createdBy === 'AI' && !r.confirmedByMangaka
                  return (
                    <li key={r.id}>
                      <button
                        type='button'
                        onClick={() => setSelectedRegionId(r.id)}
                        className={cn(
                          'w-full rounded-md border border-transparent px-2 py-1.5 text-left text-xs transition',
                          selectedRegionId === r.id ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'
                        )}
                      >
                        <div className='flex items-center justify-between'>
                          <span className='font-medium text-foreground'>
                            {t(`studio.popup.regionTypes.${r.regionType ?? 'PANEL'}`)}
                          </span>
                          {aiUnconfirmed && (
                            <span className='rounded bg-warning/20 px-1 text-[10px] font-medium text-warning'>AI</span>
                          )}
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </aside>

          {/* Center: canvas */}
          <main className='flex-1 overflow-y-auto bg-muted/30 p-5'>
            <PageRegionCanvas
              imageKey={pageImageKey}
              alt={t('studio.popup.alt', { n: pageNumber })}
              regions={regions.regions}
              proposedRegions={mapProposedForCanvas(segment.proposedRegions)}
              mode={mode}
              selectedRegionId={selectedRegionId}
              onCommitDraft={handleCommit}
              onSelectRegion={setSelectedRegionId}
              className='mx-auto max-w-3xl'
            />
          </main>

          {/* Right: selected region detail */}
          <aside className='w-64 shrink-0 overflow-y-auto border-l border-border bg-muted/10 px-3 py-3'>
            <p className='mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
              {t('studio.popup.detail.title')}
            </p>
            <SelectedDetail
              region={regions.regions.find((r) => r.id === selectedRegionId) ?? null}
              onPick={handlePickSelected}
              onConfirm={handleConfirmAiRegion}
              onDelete={async (id) => {
                setRegionPendingDelete(id)
              }}
              t={t}
            />
          </aside>
        </div>
      </div>
      <Dialog
        open={regionPendingDelete !== null}
        onClose={() => setRegionPendingDelete(null)}
        titleId='page-region-delete-title'
        title={t('studio.popup.detail.delete')}
        description={t('studio.popup.detail.deleteConfirm')}
        footer={
          <div className='flex justify-end gap-2'>
            <Button variant='ghost' size='sm' onClick={() => setRegionPendingDelete(null)}>
              {t('studio.popup.close')}
            </Button>
            <Button
              variant='destructive'
              size='sm'
              onClick={() => {
                if (regionPendingDelete) {
                  void regions.deleteRegion(regionPendingDelete)
                  setSelectedRegionId(null)
                  setRegionPendingDelete(null)
                }
              }}
            >
              {t('studio.popup.detail.delete')}
            </Button>
          </div>
        }
      >
        <p className='text-sm text-muted-foreground'>{t('studio.popup.detail.deleteConfirm')}</p>
      </Dialog>
    </div>
  )
}

function mapProposedForCanvas(proposed: ProposedRegion[]): CanvasProposedRegion[] {
  return proposed.map((p) => ({
    coordinates: p.coordinates,
    regionType: p.regionType,
    detectedSubtype: p.detectedSubtype,
    confidenceScore: p.confidenceScore
  }))
}

function SelectedDetail({
  region,
  onPick,
  onConfirm,
  onDelete,
  t
}: {
  region: RegionResDtoOutput | null
  onPick: () => void
  onConfirm: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  t: TFunction
}) {
  if (!region) {
    return <p className='text-xs text-muted-foreground'>{t('studio.popup.detail.empty')}</p>
  }
  const aiUnconfirmed = region.createdBy === 'AI' && !region.confirmedByMangaka
  return (
    <div className='space-y-3'>
      <div className='rounded-md border border-border bg-background p-3 text-xs'>
        <div className='grid grid-cols-[auto_1fr] gap-x-3 gap-y-1'>
          <span className='text-muted-foreground'>{t('studio.popup.detail.type')}</span>
          <span className='font-medium text-foreground'>
            {t(`studio.popup.regionTypes.${region.regionType ?? 'PANEL'}`)}
          </span>
          <span className='text-muted-foreground'>{t('studio.popup.detail.source')}</span>
          <span className='font-medium text-foreground'>{region.createdBy ?? 'MANUAL'}</span>
          <span className='text-muted-foreground'>{t('studio.popup.detail.coords')}</span>
          <span className='font-mono text-[10px] text-foreground'>
            {Math.round(region.coordinates?.x ?? 0)},{Math.round(region.coordinates?.y ?? 0)} ·{' '}
            {Math.round(region.coordinates?.width ?? 0)}×{Math.round(region.coordinates?.height ?? 0)}
          </span>
        </div>
      </div>
      {aiUnconfirmed && (
        <Button size='sm' variant='secondary' onClick={() => onConfirm(region.id)} className='w-full'>
          {t('studio.popup.detail.confirmAi')}
        </Button>
      )}
      <Button size='sm' onClick={onPick} className='w-full'>
        {t('studio.popup.detail.pickThis')}
      </Button>
      <Button size='sm' variant='destructive' onClick={() => void onDelete(region.id)} className='w-full'>
        {t('studio.popup.detail.delete')}
      </Button>
      {region.confidenceScore !== null && (
        <p className='text-[11px] text-muted-foreground'>
          {t('studio.popup.detail.confidence', { value: Math.round(region.confidenceScore * 100) })}
        </p>
      )}
    </div>
  )
}
