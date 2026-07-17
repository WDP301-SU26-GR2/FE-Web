import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'

import { cn } from '~/shared/lib/cn'

import { SynopsisReader } from './synopsis-reader'

type SynopsisBlockProps = {
  text: string
}

/** Inline preview length — anything longer reveals a "Read more" button. */
const PREVIEW_LIMIT = 280
/** Hard cap on what we render inline so the page never balloons. */
const INLINE_MAX = 600

function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text
  // Try to cut on a whitespace boundary within the last 24 chars for a
  // less abrupt break; otherwise fall back to a hard cut.
  const slice = text.slice(0, limit)
  const lastSpace = slice.lastIndexOf(' ')
  if (lastSpace > limit - 24) return `${slice.slice(0, lastSpace).trimEnd()}…`
  return `${slice.trimEnd()}…`
}

/**
 * Renders the proposal synopsis with a "Read more" collapse when it exceeds
 * PREVIEW_LIMIT, and an "Open reader" button that launches a long-form
 * dialog (see SynopsisReader) for comfortable reading.
 */
export function SynopsisBlock({ text }: SynopsisBlockProps) {
  const { t } = useTranslation('mangaka')
  const [expanded, setExpanded] = useState(false)
  const [readerOpen, setReaderOpen] = useState(false)

  const isLong = text.length > PREVIEW_LIMIT
  const display = !isLong || expanded ? truncate(text, INLINE_MAX) : truncate(text, PREVIEW_LIMIT)

  return (
    <div>
      <h3 className='mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground'>
        {t('seriesDetail.proposal.synopsis')}
      </h3>

      <p className='whitespace-pre-wrap text-sm leading-relaxed text-foreground'>
        {display}
      </p>

      {isLong && (
        <div className='mt-2 flex flex-wrap items-center gap-3'>
          <button
            type='button'
            onClick={() => setExpanded((v) => !v)}
            className='inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted cursor-pointer'
          >
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')}
            />
            {expanded ? t('seriesDetail.proposal.synopsisLess') : t('seriesDetail.proposal.synopsisMore')}
          </button>

          <button
            type='button'
            onClick={() => setReaderOpen(true)}
            className='text-xs font-medium text-primary underline-offset-2 hover:underline cursor-pointer'
          >
            {t('seriesDetail.proposal.synopsisReader.title')} →
          </button>
        </div>
      )}

      <SynopsisReader open={readerOpen} onClose={() => setReaderOpen(false)} synopsis={text} />
    </div>
  )
}