import { BookOpenText, FileText, Images, PanelsTopLeft, Tags, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { NameResDtoOutput } from '~/api/model/names'
import type { SeriesResDtoOutput } from '~/api/model/series'
import { StatusBadge } from '../../components/board-ui'

export interface BoardMeetingSeriesBrief {
  series: SeriesResDtoOutput
  characterDesigns: SignedImage[]
  proposalName: (Omit<NameResDtoOutput, 'pages'> & { pages: SignedNamePage[] }) | null
}

export interface SignedImage {
  key: string
  url: string
}

export interface SignedNamePage extends SignedImage {
  pageNumber: number
}

interface SeriesMeetingBriefProps {
  brief: BoardMeetingSeriesBrief
}

export function SeriesMeetingBrief({ brief }: SeriesMeetingBriefProps) {
  const { t } = useTranslation('board')
  const { series, characterDesigns, proposalName } = brief
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
      <dl className='mt-5 grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4'>
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
          value={series.genres.join(', ') || t('sessions.seriesBrief.notAvailable')}
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
              ? t(`sessions.seriesBrief.demographics.${series.demographic}`)
              : t('sessions.seriesBrief.notAvailable')
          }
        />
        <BriefField
          label={t('sessions.seriesBrief.publicationType')}
          value={
            series.publicationType
              ? t(`sessions.seriesBrief.publicationTypes.${series.publicationType}`)
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
        <h4 className='text-sm font-bold text-foreground'>{t('sessions.seriesBrief.synopsis')}</h4>
        <p className='mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground'>
          {proposal?.synopsis || t('sessions.seriesBrief.noSynopsis')}
        </p>
      </div>
      <ImageGallery
        images={characterDesigns}
        title={t('sessions.seriesBrief.characterDesignsTitle')}
        type='character'
      />
      <NameStory name={proposalName} />
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
      <h4 className='flex items-center gap-2 text-sm font-bold text-foreground'>
        <Images className='size-4 text-primary' />
        {title}
      </h4>
      <div className='mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'>
        {images.map((image, index) => (
          <a
            key={image.key}
            href={image.url}
            target='_blank'
            rel='noreferrer'
            className='overflow-hidden rounded-lg border border-border bg-muted focus-visible:outline-2 focus-visible:outline-ring'
          >
            <img
              src={image.url}
              alt={t(`sessions.seriesBrief.${type}ImageAlt`, { number: index + 1 })}
              className='aspect-square w-full object-cover'
              loading='lazy'
            />
          </a>
        ))}
      </div>
    </section>
  )
}

function NameStory({ name }: { name: BoardMeetingSeriesBrief['proposalName'] }) {
  const { t } = useTranslation('board')
  if (!name) return <p className='mt-4 text-xs text-muted-foreground'>{t('sessions.seriesBrief.noStory')}</p>

  return (
    <section className='mt-5 border-t border-border pt-5'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <h4 className='flex items-center gap-2 text-sm font-bold text-foreground'>
          <PanelsTopLeft className='size-4 text-primary' />
          {t('sessions.seriesBrief.storyTitle')}
        </h4>
        <span className='text-xs text-muted-foreground'>
          {t('sessions.seriesBrief.storyVersion', { version: name.version })} ·{' '}
          {t(`sessions.seriesBrief.nameStatuses.${name.status}`)}
        </span>
      </div>
      <ImageGallery
        images={name.pages.map((page) => ({ key: page.key, url: page.url }))}
        title={t('sessions.seriesBrief.storyPages')}
        type='story'
      />
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
