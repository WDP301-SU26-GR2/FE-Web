import { useTranslation } from 'react-i18next'
import { BookOpen } from 'lucide-react'

import { Dialog } from '~/shared/ui/dialog'

type SynopsisReaderProps = {
  open: boolean
  onClose: () => void
  synopsis: string
}

/** Word-count for Vietnamese / mixed-language prose: split on whitespace. */
function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

/**
 * Average adult reading speed ≈ 220 wpm → minutes = ceil(words / 220),
 * with a 1-minute floor so the label never reads "0 min".
 */
function estimateReadingMinutes(words: number): number {
  return Math.max(1, Math.ceil(words / 220))
}

/**
 * Content copied from rich-text sources can contain invisible separators.
 * They make Vietnamese glyph clusters look split apart in the reader, so
 * strip them and normalize the remaining Unicode before rendering.
 */
function normalizeSynopsis(text: string): string {
  return text.normalize('NFC').replace(/[\u00AD\u200B-\u200D\u2060\uFEFF]/g, '')
}

/**
 * Reader dialog for the proposal synopsis. Mirrors how a word-processor
 * renders a long document: serif-feel body, generous line-height, centered
 * column, and a meta strip showing word count + reading time so Mangakas
 * can gauge the document before sitting down to read it.
 */
export function SynopsisReader({ open, onClose, synopsis }: SynopsisReaderProps) {
  const { t } = useTranslation('mangaka')
  const normalizedSynopsis = normalizeSynopsis(synopsis)
  const words = countWords(normalizedSynopsis)
  const minutes = estimateReadingMinutes(words)

  const titleId = 'synopsis-reader-title'
  const metaId = 'synopsis-reader-meta'

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId={titleId}
      title={
        <span className='flex items-center gap-2'>
          <BookOpen className='h-5 w-5 text-primary' />
          {t('seriesDetail.proposal.synopsisReader.title')}
        </span>
      }
      descriptionId={metaId}
      description={
        <span className='flex flex-wrap gap-x-3 gap-y-0.5'>
          <span>{t('seriesDetail.proposal.synopsisReader.wordCount', { count: normalizedSynopsis.length })}</span>
          <span aria-hidden='true'>·</span>
          <span>{t('seriesDetail.proposal.synopsisReader.readingTime', { minutes })}</span>
        </span>
      }
      size='xl'
    >
      <article className='mx-auto max-w-prose font-sans text-base leading-7 tracking-normal text-foreground antialiased'>
        {normalizedSynopsis.split(/\n{2,}/).map((para, idx) => (
          <p key={idx} className={idx === 0 ? '' : 'mt-5'}>
            {para}
          </p>
        ))}
      </article>
    </Dialog>
  )
}
