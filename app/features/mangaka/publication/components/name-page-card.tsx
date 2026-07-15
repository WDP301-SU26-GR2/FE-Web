import { useTranslation } from 'react-i18next'
import { ImageIcon } from 'lucide-react'

import { SignedImage } from '~/shared/components/signed-image'

type NamePageCardProps = {
  pageNumber: number
  fileUrl: string
  alt: string
  onClick?: () => void
}

/**
 * One pre-storyboard page (storyboard thumb) inside the Name section.
 * Clickable (if `onClick` is provided) — typically opens a lightbox preview.
 */
export function NamePageCard({ pageNumber, fileUrl, alt, onClick }: NamePageCardProps) {
  const { t } = useTranslation('mangaka')

  const body = (
    <div className='flex flex-col gap-2 rounded-lg border border-border bg-card p-2 transition-all hover:shadow-sm'>
      <SignedImage r2Key={fileUrl} alt={alt} aspectClassName='aspect-[3/4]' className='w-full' />
      <div className='flex items-center justify-between px-1'>
        <span className='truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
          {t('publication.nameSection.pageNumber', { n: pageNumber })}
        </span>
        {onClick && (
          <span className='text-[10px] text-muted-foreground'>{t('publication.preview')}</span>
        )}
      </div>
    </div>
  )

  if (!onClick) {
    return body
  }

  return (
    <button
      type='button'
      onClick={onClick}
      className='group block w-full cursor-pointer rounded-lg text-left transition-all hover:border-primary hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ring'
    >
      {body}
    </button>
  )
}

export function NamePagePlaceholder({ children }: { children?: React.ReactNode }) {
  const { t } = useTranslation('mangaka')
  return (
    <div className='flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-muted/20 text-muted-foreground/60'>
      <ImageIcon className='h-5 w-5' />
      <span className='text-[10px]'>{children ?? t('publication.noImage')}</span>
    </div>
  )
}
