import { useFetcher } from 'react-router'
import { useTranslation } from 'react-i18next'
import type {
  AmendmentResDtoOutput,
  ContractResDtoOutput,
  ContractStatusProgressResDtoOutput
} from '~/api/model/contracts'
import type { EditorActionResult } from '../types'
import { ContractActionMessage, ContractPageLayout, contractInput } from './components/contract-shared'

export function EditorContractAmendmentsPage({
  contract,
  progress,
  amendments
}: {
  contract: ContractResDtoOutput
  progress: ContractStatusProgressResDtoOutput | null
  amendments: AmendmentResDtoOutput[]
}) {
  const { t } = useTranslation('editor')
  const fetcher = useFetcher<EditorActionResult>()
  const hasOpenAmendment = amendments.some((item) => item.status === 'DRAFT' || item.status === 'PENDING_SIGNATURES')
  const canCreate = contract.status === 'FULLY_EXECUTED' && !hasOpenAmendment
  return (
    <ContractPageLayout contract={contract} progress={progress} title={t('contractDetail.sections.amendments')}>
      <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
        {canCreate ? (
          <fetcher.Form method='post' className='grid gap-3 sm:grid-cols-2'>
            <input type='hidden' name='contractType' value={contract.contractType} />
            <input
              name='changedClauses'
              required
              className={contractInput}
              placeholder={t('contractDetail.changedClauses')}
            />
            <input name='reason' className={contractInput} placeholder={t('contractDetail.reason')} />
            <AmendmentTermFields />
            <button
              name='intent'
              value='createAmendment'
              className='rounded-md bg-primary px-3 py-2 text-sm font-bold text-primary-foreground sm:col-span-2'
            >
              {t('actions.createAmendment')}
            </button>
          </fetcher.Form>
        ) : (
          <p className='rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground'>
            {t('contractDetail.amendmentCreateUnavailable')}
          </p>
        )}
        <div className='mt-5 space-y-3'>
          {amendments.map((amendment) => (
            <article key={amendment.id} className='rounded-lg border border-border p-4'>
              <div className='flex justify-between gap-3'>
                <strong>{amendment.changedClauses.join(', ')}</strong>
                <span className='rounded-full bg-muted px-2 py-1 text-[10px] font-bold'>{amendment.status}</span>
              </div>
              <p className='mt-2 text-sm text-muted-foreground'>{amendment.reason}</p>
              {amendment.status === 'DRAFT' && (
                <div className='mt-3 space-y-2 border-t border-border pt-3'>
                  <fetcher.Form method='post' className='grid gap-2 sm:grid-cols-2'>
                    <input type='hidden' name='amendmentId' value={amendment.id} />
                    <input type='hidden' name='contractType' value={contract.contractType} />
                    <input
                      name='changedClauses'
                      required
                      defaultValue={amendment.changedClauses.join(', ')}
                      className={contractInput}
                    />
                    <input name='reason' defaultValue={amendment.reason ?? ''} className={contractInput} />
                    <AmendmentTermFields amendment={amendment} />
                    <div className='flex gap-2 sm:col-span-2'>
                      <button
                        name='intent'
                        value='updateAmendment'
                        className='flex-1 rounded-md border border-border px-2 text-xs font-bold'
                      >
                        {t('actions.update')}
                      </button>
                      <button
                        name='intent'
                        value='submitAmendment'
                        className='flex-1 rounded-md bg-primary px-2 text-xs font-bold text-primary-foreground'
                      >
                        {t('actions.submit')}
                      </button>
                    </div>
                  </fetcher.Form>
                  <fetcher.Form method='post' className='flex gap-2'>
                    <input type='hidden' name='amendmentId' value={amendment.id} />
                    <input
                      name='voidReason'
                      required
                      className={contractInput}
                      placeholder={t('contractDetail.voidReason')}
                    />
                    <button
                      name='intent'
                      value='voidAmendment'
                      className='rounded-md bg-destructive px-3 text-xs font-bold text-destructive-foreground'
                    >
                      {t('actions.void')}
                    </button>
                  </fetcher.Form>
                </div>
              )}
            </article>
          ))}
          {!amendments.length && <p className='text-sm text-muted-foreground'>{t('contractDetail.emptyAmendments')}</p>}
        </div>
        <ContractActionMessage data={fetcher.data} />
      </section>
    </ContractPageLayout>
  )
}

function AmendmentTermFields({ amendment }: { amendment?: AmendmentResDtoOutput }) {
  const { t } = useTranslation('editor')
  return (
    <>
      <input
        name='valuationAmount'
        type='number'
        min={0}
        defaultValue={numberValue(amendment?.valuationAmount)}
        className={contractInput}
        placeholder={t('contracts.valuation')}
      />
      <input
        name='publisherOwnershipPct'
        type='number'
        min={0}
        max={100}
        defaultValue={numberValue(amendment?.publisherOwnershipPct)}
        className={contractInput}
        placeholder={t('contracts.publisherPct')}
      />
      <input
        name='mangakaOwnershipPct'
        type='number'
        min={0}
        max={100}
        defaultValue={numberValue(amendment?.mangakaOwnershipPct)}
        className={contractInput}
        placeholder={t('contracts.mangakaPct')}
      />
      <input
        name='terminationClause'
        defaultValue={amendment?.terminationClause ?? ''}
        className={contractInput}
        placeholder={t('contracts.terminationClause')}
      />
      <input
        name='contractStart'
        type='datetime-local'
        defaultValue={toLocal(amendment?.contractStart)}
        className={contractInput}
      />
      <input
        name='contractEnd'
        type='datetime-local'
        defaultValue={toLocal(amendment?.contractEnd)}
        className={contractInput}
      />
    </>
  )
}

function numberValue(value: number | null | undefined) {
  return value ?? ''
}

function toLocal(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}
