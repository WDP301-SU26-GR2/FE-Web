import { useTranslation } from 'react-i18next'
import type { ProposalFormData } from '../create-proposal-wizard'

interface Props {
  form: ProposalFormData
  onChange: <K extends keyof ProposalFormData>(key: K, value: ProposalFormData[K]) => void
}

export function BasicInfoStep({ form, onChange }: Props) {
  const { t } = useTranslation('mangaka')

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-lg font-bold'>{t('wizard.step1')}</h2>
        <p className='mt-1 text-sm text-muted-foreground'>{t('wizard.step1Desc')}</p>
      </div>

      <div className='grid grid-cols-1 gap-5 sm:grid-cols-2'>
        {/* Series Title */}
        <div className='sm:col-span-2'>
          <label className='mb-1.5 block text-sm font-semibold'>
            {t('wizard.seriesTitle')} <span className='text-destructive'>*</span>
          </label>
          <input
            type='text'
            value={form.seriesTitle}
            onChange={(e) => onChange('seriesTitle', e.target.value)}
            placeholder={t('wizard.seriesTitlePlaceholder')}
            className='w-full rounded-md border border-input bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none'
          />
        </div>

        {/* Alt Titles */}
        <div className='sm:col-span-2'>
          <label className='mb-1.5 block text-sm font-semibold'>{t('wizard.altTitles')}</label>
          <input
            type='text'
            value={form.altTitles}
            onChange={(e) => onChange('altTitles', e.target.value)}
            placeholder={t('wizard.altTitlesPlaceholder')}
            className='w-full rounded-md border border-input bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none'
          />
        </div>

        {/* Author */}
        <div>
          <label className='mb-1.5 block text-sm font-semibold'>
            {t('wizard.author')} <span className='text-destructive'>*</span>
          </label>
          <input
            type='text'
            value={form.author}
            onChange={(e) => onChange('author', e.target.value)}
            placeholder={t('wizard.authorPlaceholder')}
            className='w-full rounded-md border border-input bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none'
          />
        </div>

        {/* Demographic */}
        <div>
          <label className='mb-1.5 block text-sm font-semibold'>{t('wizard.demographic')}</label>
          <select
            value={form.demographic}
            onChange={(e) => onChange('demographic', e.target.value)}
            className='w-full rounded-md border border-input bg-background px-3.5 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none'
          >
            <option value=''>{t('wizard.selectOption')}</option>
            <option value='shonen'>Shonen</option>
            <option value='shoujo'>Shoujo</option>
            <option value='seinen'>Seinen</option>
            <option value='josei'>Josei</option>
            <option value='kodomo'>Kodomo</option>
          </select>
        </div>

        {/* Series Type */}
        <div>
          <label className='mb-1.5 block text-sm font-semibold'>{t('wizard.seriesType')}</label>
          <select
            value={form.seriesType}
            onChange={(e) => onChange('seriesType', e.target.value)}
            className='w-full rounded-md border border-input bg-background px-3.5 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none'
          >
            <option value=''>{t('wizard.selectOption')}</option>
            <option value='manga'>Manga</option>
            <option value='manhwa'>Manhwa</option>
            <option value='manhua'>Manhua</option>
            <option value='comic'>Comic</option>
          </select>
        </div>

        {/* Tags */}
        <div>
          <label className='mb-1.5 block text-sm font-semibold'>{t('wizard.tags')}</label>
          <input
            type='text'
            value={form.tags}
            onChange={(e) => onChange('tags', e.target.value)}
            placeholder={t('wizard.tagsPlaceholder')}
            className='w-full rounded-md border border-input bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none'
          />
        </div>

        {/* Synopsis */}
        <div className='sm:col-span-2'>
          <label className='mb-1.5 block text-sm font-semibold'>
            {t('wizard.synopsis')} <span className='text-destructive'>*</span>
          </label>
          <textarea
            value={form.synopsis}
            onChange={(e) => onChange('synopsis', e.target.value)}
            placeholder={t('wizard.synopsisPlaceholder')}
            rows={5}
            className='w-full resize-none rounded-md border border-input bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none'
          />
          <p className='mt-1 text-xs text-muted-foreground'>{t('wizard.synopsisHint')}</p>
        </div>
      </div>
    </div>
  )
}
