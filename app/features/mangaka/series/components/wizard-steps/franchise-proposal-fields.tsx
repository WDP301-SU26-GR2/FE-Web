import { Loader2, Search } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { CreateProposalBodyDtoRelationshipType } from '~/api/model/series'
import { usePublicParentSeries } from '../../use-public-parent-series'

const RELATIONSHIP_TYPES = [
  'SEQUEL',
  'SPINOFF',
  'SIDE_STORY',
  'REBOOT'
] as const satisfies readonly CreateProposalBodyDtoRelationshipType[]

export type FranchiseProposalValue = {
  isDerivative: boolean
  parentSeriesId: string
  parentSeriesTitle: string
  relationshipType: CreateProposalBodyDtoRelationshipType | ''
}

type FranchiseProposalFieldsProps = {
  value: FranchiseProposalValue
  onChange: (value: FranchiseProposalValue) => void
}

export function FranchiseProposalFields({ value, onChange }: FranchiseProposalFieldsProps) {
  const { t } = useTranslation('mangaka')
  const [search, setSearch] = useState('')
  const { items, isLoading, hasError } = usePublicParentSeries(search)
  const selectedIsInResults = items.some((item) => item.id === value.parentSeriesId)

  return (
    <fieldset className='rounded-lg border border-border bg-muted/20 p-4 sm:col-span-2'>
      <legend className='px-1 text-sm font-semibold'>{t('wizard.franchise.title')}</legend>

      <label className='flex cursor-pointer items-start gap-3'>
        <input
          type='checkbox'
          checked={value.isDerivative}
          onChange={(event) => {
            onChange(
              event.target.checked
                ? { ...value, isDerivative: true }
                : {
                    isDerivative: false,
                    parentSeriesId: '',
                    parentSeriesTitle: '',
                    relationshipType: ''
                  }
            )
          }}
          className='mt-0.5 h-4 w-4 rounded border-input text-primary accent-primary focus:ring-ring'
          aria-describedby='franchise-proposal-description'
        />
        <span>
          <span className='block text-sm font-semibold'>{t('wizard.franchise.toggle')}</span>
          <span id='franchise-proposal-description' className='mt-0.5 block text-xs text-muted-foreground'>
            {t('wizard.franchise.description')}
          </span>
        </span>
      </label>

      {value.isDerivative && (
        <div className='mt-4 grid gap-4 sm:grid-cols-2'>
          <div className='space-y-1.5 sm:col-span-2'>
            <label htmlFor='franchise-parent-search' className='block text-sm font-semibold'>
              {t('wizard.franchise.searchLabel')}
            </label>
            <div className='relative'>
              <Search
                aria-hidden='true'
                className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground'
              />
              <input
                id='franchise-parent-search'
                type='search'
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('wizard.franchise.searchPlaceholder')}
                className='w-full rounded-md border border-input bg-background py-2.5 pl-9 pr-9 text-sm placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring'
              />
              {isLoading && (
                <Loader2
                  aria-label={t('wizard.franchise.loading')}
                  className='absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground'
                />
              )}
            </div>
          </div>

          <div className='space-y-1.5'>
            <label htmlFor='franchise-parent-series' className='block text-sm font-semibold'>
              {t('wizard.franchise.parentLabel')} <span className='text-destructive'>*</span>
            </label>
            <select
              id='franchise-parent-series'
              value={value.parentSeriesId}
              disabled={isLoading}
              onChange={(event) => {
                const parentSeries = items.find((item) => item.id === event.target.value)
                onChange({
                  ...value,
                  parentSeriesId: event.target.value,
                  parentSeriesTitle:
                    parentSeries?.title ?? (event.target.value === value.parentSeriesId ? value.parentSeriesTitle : '')
                })
              }}
              aria-describedby='franchise-parent-hint'
              className='w-full rounded-md border border-input bg-background px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-wait disabled:opacity-60'
            >
              <option value=''>{t('wizard.franchise.parentPlaceholder')}</option>
              {value.parentSeriesId && !selectedIsInResults && (
                <option value={value.parentSeriesId}>{value.parentSeriesTitle}</option>
              )}
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} · {t(`wizard.franchise.status.${item.status}`)}
                </option>
              ))}
            </select>
            <p id='franchise-parent-hint' className='text-xs text-muted-foreground'>
              {hasError
                ? t('wizard.franchise.loadError')
                : !isLoading && items.length === 0
                  ? t('wizard.franchise.empty')
                  : t('wizard.franchise.parentHint')}
            </p>
          </div>

          <div className='space-y-1.5'>
            <label htmlFor='franchise-relationship-type' className='block text-sm font-semibold'>
              {t('wizard.franchise.relationshipLabel')} <span className='text-destructive'>*</span>
            </label>
            <select
              id='franchise-relationship-type'
              value={value.relationshipType}
              onChange={(event) =>
                onChange({
                  ...value,
                  relationshipType: event.target.value as CreateProposalBodyDtoRelationshipType | ''
                })
              }
              className='w-full rounded-md border border-input bg-background px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring'
            >
              <option value=''>{t('wizard.franchise.relationshipPlaceholder')}</option>
              {RELATIONSHIP_TYPES.map((relationshipType) => (
                <option key={relationshipType} value={relationshipType}>
                  {t(`wizard.franchise.relationship.${relationshipType}`)}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </fieldset>
  )
}
