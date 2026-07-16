import { useTranslation } from 'react-i18next'
import type {
  ContractResDtoOutput,
  ContractStatusProgressResDtoOutput,
  ContractVersionResDtoOutput
} from '~/api/model/contracts'
import { ContractPageLayout } from './components/contract-shared'

export function EditorContractHistoryPage({
  contract,
  progress,
  versions
}: {
  contract: ContractResDtoOutput
  progress: ContractStatusProgressResDtoOutput | null
  versions: ContractVersionResDtoOutput[]
}) {
  const { t } = useTranslation('editor')
  return (
    <ContractPageLayout contract={contract} progress={progress} title={t('contractDetail.versions')}>
      <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
        <div className='space-y-2'>
          {versions.map((version) => (
            <article key={version.id} className='rounded-lg border border-border p-3'>
              <div className='flex justify-between'>
                <strong>v{version.versionNumber}</strong>
                <span className='text-xs text-muted-foreground'>{new Date(version.createdAt).toLocaleString()}</span>
              </div>
              <p className='mt-2 text-sm text-muted-foreground'>
                {version.note ?? '—'} · {version.valuationAmount ?? '—'}
              </p>
            </article>
          ))}
          {!versions.length && <p className='text-sm text-muted-foreground'>{t('contractDetail.emptyVersions')}</p>}
        </div>
      </section>
    </ContractPageLayout>
  )
}
