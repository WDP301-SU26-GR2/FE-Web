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
  return (
    <ContractPageLayout contract={contract} progress={progress} title={t('contractDetail.sections.amendments')}>
      <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
        <fetcher.Form method='post' className='grid gap-3 sm:grid-cols-2'>
          <input
            name='changedClauses'
            required
            className={contractInput}
            placeholder={t('contractDetail.changedClauses')}
          />
          <input name='reason' required className={contractInput} placeholder={t('contractDetail.reason')} />
          <input
            name='valuationAmount'
            type='number'
            min={1}
            className={contractInput}
            placeholder={t('contracts.valuation')}
          />
          <button
            name='intent'
            value='createAmendment'
            className='rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground'
          >
            {t('actions.createAmendment')}
          </button>
        </fetcher.Form>
        <div className='mt-5 space-y-3'>
          {amendments.map((amendment) => (
            <article key={amendment.id} className='rounded-lg border border-border p-4'>
              <div className='flex justify-between gap-3'>
                <strong>{amendment.changedClauses.join(', ')}</strong>
                <span className='rounded-full bg-muted px-2 py-1 text-[10px] font-bold'>{amendment.status}</span>
              </div>
              <p className='mt-2 text-sm text-muted-foreground'>{amendment.reason}</p>
              {amendment.status === 'DRAFT' && (
                <fetcher.Form method='post' className='mt-3 grid gap-2 sm:grid-cols-3'>
                  <input type='hidden' name='amendmentId' value={amendment.id} />
                  <input
                    name='changedClauses'
                    defaultValue={amendment.changedClauses.join(', ')}
                    className={contractInput}
                  />
                  <input name='reason' defaultValue={amendment.reason ?? ''} className={contractInput} />
                  <div className='flex gap-2'>
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
                    <button
                      name='intent'
                      value='voidAmendment'
                      className='flex-1 rounded-md bg-destructive px-2 text-xs font-bold text-destructive-foreground'
                    >
                      {t('actions.void')}
                    </button>
                  </div>
                </fetcher.Form>
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
