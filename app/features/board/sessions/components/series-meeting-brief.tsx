import { BookOpenText, FileText, Images, Tags, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { SeriesResDtoOutput } from '~/api/model/series'
import { ImagePreview } from '~/shared/components'
import { StatusBadge } from '../../components/board-ui'

export interface BoardMeetingSeriesBrief {
  series: SeriesResDtoOutput
  characterDesigns: SignedImage[]
  proposalStoryboardPages: SignedStoryboardPage[]
}

export interface SignedImage {
  key: string
  url: string
}

export interface SignedStoryboardPage extends SignedImage {
  pageNumber: number
}

interface SeriesMeetingBriefProps {
  brief: BoardMeetingSeriesBrief
}

export function SeriesMeetingBrief({ brief }: SeriesMeetingBriefProps) {
  const { t } = useTranslation('board')
  const { series, characterDesigns, proposalStoryboardPages } = brief
  const proposal = series.proposal

  return (
    <article className='rounded-xl border border-border bg-background p-5'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='min-w-0'>
          <p className='flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary'>
            <BookOpenText className='size-4' />
            {t('sessions.seriesBrief.label')}
          </p>
          <h3 className='mt-2 text-xl font-bold text-foreground'>{series.title}</h3>
        </div>
        <StatusBadge value={series.status} />
      </div>
      <dl className='mt-5 grid gap-4 text-xs sm:grid-cols-2 xl:grid-cols-4'>
        <BriefField
          icon={<UserRound className='size-4' />}
          label={t('sessions.seriesBrief.mangaka')}
          value={series.mangaka?.displayName ?? t('sessions.seriesBrief.notAvailable')}
        />
        <BriefField
          icon={<UserRound className='size-4' />}
          label={t('sessions.seriesBrief.editor')}
          value={series.editor?.displayName ?? t('sessions.seriesBrief.notAssigned')}
        />
        <BriefField
          icon={<Tags className='size-4' />}
          label={t('sessions.seriesBrief.genres')}
          value={
            series.genres
              .map((genre) =>
                t(`common:businessData.values.${genre}`, { defaultValue: t('sessions.seriesBrief.notAvailable') })
              )
              .join(', ') || t('sessions.seriesBrief.notAvailable')
          }
        />
        <BriefField
          icon={<FileText className='size-4' />}
          label={t('sessions.seriesBrief.estimatedLength')}
          value={
            proposal?.estimatedLength == null
              ? t('sessions.seriesBrief.notAvailable')
              : t('sessions.seriesBrief.chapters', { count: proposal.estimatedLength })
          }
        />
      </dl>
      <div className='mt-5 grid gap-4 lg:grid-cols-3'>
        <BriefField
          label={t('sessions.seriesBrief.demographic')}
          value={
            series.demographic
              ? t(`common:businessData.values.${series.demographic}`, {
                  defaultValue: t('sessions.seriesBrief.notAvailable')
                })
              : t('sessions.seriesBrief.notAvailable')
          }
        />
        <BriefField
          label={t('sessions.seriesBrief.publicationType')}
          value={
            series.publicationType
              ? t(`common:businessData.values.${series.publicationType}`, {
                  defaultValue: t('sessions.seriesBrief.notAvailable')
                })
              : t('sessions.seriesBrief.notAvailable')
          }
        />
        <BriefField
          label={t('sessions.seriesBrief.proposalStatus')}
          value={
            proposal?.status
              ? t(`sessions.seriesBrief.proposalStatuses.${proposal.status}`)
              : t('sessions.seriesBrief.notAvailable')
          }
        />
      </div>
      <div className='mt-5 border-t border-border pt-5'>
        <h4 className='text-xs font-bold text-foreground'>{t('sessions.seriesBrief.synopsis')}</h4>
        <p className='mt-2 whitespace-pre-wrap text-xs leading-6 text-muted-foreground'>
          {proposal?.synopsis || t('sessions.seriesBrief.noSynopsis')}
        </p>
      </div>
      <ImageGallery
        images={characterDesigns}
        title={t('sessions.seriesBrief.characterDesignsTitle')}
        type='character'
      />
      <ImageGallery
        images={proposalStoryboardPages.map((page) => ({ key: page.key, url: page.url }))}
        title={t('sessions.seriesBrief.storyPages')}
        type='story'
      />
    </article>
  )
}

function ImageGallery({ images, title, type }: { images: SignedImage[]; title: string; type: 'character' | 'story' }) {
  const { t } = useTranslation('board')
  if (!images.length)
    return (
      <p className='mt-4 text-xs text-muted-foreground'>
        {t(`sessions.seriesBrief.no${type === 'character' ? 'CharacterDesigns' : 'StoryPages'}`)}
      </p>
    )

  return (
    <section className='mt-5 border-t border-border pt-5'>
      <h4 className='flex items-center gap-2 text-xs font-bold text-foreground'>
        <Images className='size-4 text-primary' />
        {title}
      </h4>
      <div className='mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'>
        {images.map((image, index) => (
          <ImagePreview
            key={image.key}
            src={image.url}
            alt={t(`sessions.seriesBrief.${type}ImageAlt`, { number: index + 1 })}
            title={t(`sessions.seriesBrief.${type}ImageAlt`, { number: index + 1 })}
            description={title}
            openOriginalLabel={t('sessions.seriesBrief.openOriginalImage')}
            imageClassName='aspect-square w-full object-cover'
            triggerClassName='rounded-lg border border-border bg-muted'
          />
        ))}
      </div>
    </section>
  )
}

interface BriefFieldProps {
  icon?: ReactNode
  label: string
  value: string
}

function BriefField({ icon, label, value }: BriefFieldProps) {
  return (
    <div>
      <dt className='flex items-center gap-1.5 text-xs font-semibold text-muted-foreground'>
        {icon}
        {label}
      </dt>
      <dd className='mt-1 font-semibold text-foreground'>{value}</dd>
    </div>
  )
}
