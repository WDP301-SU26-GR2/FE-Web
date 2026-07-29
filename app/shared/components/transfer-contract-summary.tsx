import { ArrowRight, BadgeDollarSign, PieChart, ShieldCheck, UsersRound } from 'lucide-react'
import type { TransferContractResDtoOutput } from '~/api/model/transfer'

export type TransferContractSummaryLabels = {
  title: string
  description: string
  status: string
  statusValue: string
  type: string
  typeValue: string
  amount: string
  parties: string
  ownership: string
  publisher: string
  originalMangaka: string
  newMangaka: string
  coOwnerRequired: string
  coOwnerNotRequired: string
  unknown: string
}

export function TransferContractSummary({
  contract,
  labels,
  locale
}: {
  contract: TransferContractResDtoOutput
  labels: TransferContractSummaryLabels
  locale: string
}) {
  const split = contract.newOwnershipSplit

  return (
    <section className='overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-sm'>
      <div className='border-b border-primary/15 bg-primary/5 p-5 sm:p-6'>
        <div className='flex flex-col justify-between gap-4 sm:flex-row sm:items-start'>
          <div className='flex min-w-0 gap-3'>
            <span className='flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground'>
              <ShieldCheck className='size-5' aria-hidden='true' />
            </span>
            <div className='min-w-0'>
              <h2 className='font-bold text-foreground'>{labels.title}</h2>
              <p className='mt-1 text-xs leading-5 text-muted-foreground'>{labels.description}</p>
            </div>
          </div>
          <span className='w-fit rounded-full border border-primary/20 bg-background px-3 py-1 text-[11px] font-bold text-primary'>
            {labels.status}: {labels.statusValue}
          </span>
        </div>
      </div>

      <div className='grid gap-4 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3'>
        <SummaryFact
          icon={BadgeDollarSign}
          label={labels.amount}
          value={
            contract.transferAmount == null
              ? labels.unknown
              : new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(contract.transferAmount)
          }
        />
        <SummaryFact icon={ArrowRight} label={labels.type} value={labels.typeValue} />
        <SummaryFact
          icon={UsersRound}
          label={labels.parties}
          value={`${contract.fromMangaka?.displayName ?? labels.unknown} → ${contract.toMangaka?.displayName ?? labels.unknown}`}
        />
      </div>

      <div className='mx-5 mb-5 rounded-xl border border-border bg-muted/35 p-4 sm:mx-6 sm:mb-6'>
        <div className='flex items-center gap-2 text-xs font-bold text-foreground'>
          <PieChart className='size-4 text-primary' aria-hidden='true' />
          {labels.ownership}
        </div>
        <div className='mt-4 grid gap-3 sm:grid-cols-3'>
          <OwnershipShare label={labels.publisher} value={split?.publisher} />
          <OwnershipShare label={labels.originalMangaka} value={split?.originalMangaka} />
          <OwnershipShare label={labels.newMangaka} value={split?.newMangaka} />
        </div>
        <p className='mt-4 text-xs leading-5 text-muted-foreground'>
          {contract.coOwnerApprovalRequired ? labels.coOwnerRequired : labels.coOwnerNotRequired}
        </p>
      </div>
    </section>
  )
}

function SummaryFact({ icon: Icon, label, value }: { icon: typeof ShieldCheck; label: string; value: string }) {
  return (
    <div className='rounded-xl border border-border p-4'>
      <div className='flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground'>
        <Icon className='size-4 text-primary' aria-hidden='true' />
        {label}
      </div>
      <p className='mt-2 text-sm font-bold text-foreground'>{value}</p>
    </div>
  )
}

function OwnershipShare({ label, value }: { label: string; value?: number }) {
  return (
    <div>
      <div className='flex items-center justify-between gap-2 text-xs'>
        <span className='text-muted-foreground'>{label}</span>
        <strong className='text-foreground'>{value ?? 0}%</strong>
      </div>
      <div className='mt-2 h-1.5 overflow-hidden rounded-full bg-border'>
        <div
          className='h-full rounded-full bg-primary'
          style={{ width: `${Math.min(100, Math.max(0, value ?? 0))}%` }}
        />
      </div>
    </div>
  )
}
