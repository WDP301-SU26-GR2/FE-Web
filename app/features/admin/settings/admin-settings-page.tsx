import { useState } from 'react'
import { Link, useFetcher } from 'react-router'
import { ArrowLeft, Gavel, Loader2, Pencil, Save, Settings2, SlidersHorizontal, Vote } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { AdminSettingsActionResult, AdminSettingsData } from './types'
import { Dialog } from '~/shared/ui/dialog'

export function AdminSettingsPage({ data, hasError }: { data: AdminSettingsData | null; hasError: boolean }) {
  const { t } = useTranslation('admin')

  if (hasError || !data) {
    return (
      <div className='space-y-6'>
        <AdminDashboardBackLink label={t('navigation.backDashboard')} />
        <div className='rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-destructive' role='alert'>
          <p className='font-bold'>{t('settings.loadError.title')}</p>
          <p className='mt-1 text-sm'>{t('settings.loadError.description')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-6 pb-12'>
      <AdminDashboardBackLink label={t('navigation.backDashboard')} />
      <header>
        <div className='flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary'>
          <Settings2 className='size-4' />
          {t('settings.eyebrow')}
        </div>
        <h1 className='mt-2 text-2xl font-bold text-foreground md:text-3xl'>{t('settings.title')}</h1>
        <p className='mt-2 max-w-3xl text-sm leading-6 text-muted-foreground'>{t('settings.subtitle')}</p>
      </header>

      <AppConfigForm data={data} />
      <BoardConfigForm data={data} />
      <VotingConfigForm data={data} />
    </div>
  )
}

function AppConfigForm({ data }: { data: AdminSettingsData }) {
  const { t } = useTranslation('admin')
  const fetcher = useFetcher<AdminSettingsActionResult>()
  const config = data.appConfig
  const [open, setOpen] = useState(false)

  return (
    <>
      <ConfigCard icon={SlidersHorizontal} title={t('settings.app.title')} description={t('settings.app.description')}>
        <EditConfigButton onClick={() => setOpen(true)} label={t('settings.edit')} />
      </ConfigCard>
      {open && (
      <Dialog open onClose={() => setOpen(false)} titleId='edit-app-config' title={t('settings.app.title')} description={t('settings.app.description')} size='xl'>
      <fetcher.Form method='post'>
        <input type='hidden' name='intent' value='appConfig' />
        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
          <NumberField
            name='coOwnerApprovalGraceDays'
            value={config.coOwnerApprovalGraceDays}
            min={0}
            label={t('settings.app.coOwnerApprovalGraceDays')}
            unit={t('settings.units.days')}
          />
          <NumberField
            name='nameMaxReviewRounds'
            value={config.nameMaxReviewRounds}
            min={1}
            label={t('settings.app.nameMaxReviewRounds')}
          />
          <NumberField
            name='reputationRecommendThreshold'
            value={config.reputationRecommendThreshold}
            min={1}
            max={5}
            step={0.1}
            label={t('settings.app.reputationRecommendThreshold')}
          />
          <NumberField
            name='hiatusTooLongDays'
            value={config.hiatusTooLongDays}
            min={1}
            label={t('settings.app.hiatusTooLongDays')}
            unit={t('settings.units.days')}
          />
          <NumberField
            name='lowVoteReliabilityThreshold'
            value={config.lowVoteReliabilityThreshold}
            min={0}
            label={t('settings.app.lowVoteReliabilityThreshold')}
          />
          <NumberField
            name='maxUploadMb'
            value={bytesToMb(config.maxUploadBytes)}
            min={1}
            max={50}
            step={1}
            label={t('settings.app.maxUploadBytes')}
            unit='MB'
          />
          <NumberField
            name='assignmentGraceDays'
            value={config.assignmentGraceDays}
            min={0}
            label={t('settings.app.assignmentGraceDays')}
            unit={t('settings.units.days')}
          />
        </div>
        <FormFooter fetcher={fetcher} updatedAt={config.updatedAt} />
      </fetcher.Form>
      </Dialog>
      )}
    </>
  )
}

function AdminDashboardBackLink({ label }: { label: string }) {
  return (
    <Link to='/dashboard/admin' className='inline-flex items-center gap-2 text-sm font-bold text-primary'>
      <ArrowLeft className='size-4' />
      {label}
    </Link>
  )
}

function BoardConfigForm({ data }: { data: AdminSettingsData }) {
  const { t } = useTranslation('admin')
  const fetcher = useFetcher<AdminSettingsActionResult>()
  const config = data.boardConfig
  const [open, setOpen] = useState(false)

  return (
    <>
      <ConfigCard icon={Gavel} title={t('settings.board.title')} description={t('settings.board.description')}>
        <EditConfigButton onClick={() => setOpen(true)} label={t('settings.edit')} />
      </ConfigCard>
      {open && (
      <Dialog open onClose={() => setOpen(false)} titleId='edit-board-config' title={t('settings.board.title')} description={t('settings.board.description')} size='lg'>
      <fetcher.Form method='post'>
        <input type='hidden' name='intent' value='boardConfig' />
        <input type='hidden' name='configId' value={config.id} />
        <input type='hidden' name='updatedBy' value={data.currentUserId} />
        <div className='grid gap-4 md:grid-cols-3'>
          <NumberField
            name='boardTotalMembers'
            value={config.boardTotalMembers}
            min={3}
            step={2}
            label={t('settings.board.boardTotalMembers')}
          />
          <NumberField name='quorumMin' value={config.quorumMin} min={1} label={t('settings.board.quorumMin')} />
          <NumberField
            name='approveMajorityPercent'
            value={Math.round(config.approveMajorityRatio * 100)}
            min={1}
            max={100}
            label={t('settings.board.approveMajorityRatio')}
            unit='%'
          />
        </div>
        <p className='mt-3 text-xs text-muted-foreground'>{t('settings.board.lockNotice')}</p>
        <FormFooter fetcher={fetcher} updatedAt={config.updatedAt} />
      </fetcher.Form>
      </Dialog>
      )}
    </>
  )
}

function VotingConfigForm({ data }: { data: AdminSettingsData }) {
  const { t } = useTranslation('admin')
  const fetcher = useFetcher<AdminSettingsActionResult>()
  const config = data.votingConfig
  const [open, setOpen] = useState(false)

  return (
    <>
      <ConfigCard icon={Vote} title={t('settings.voting.title')} description={t('settings.voting.description')}>
        <EditConfigButton onClick={() => setOpen(true)} label={t('settings.edit')} />
      </ConfigCard>
      {open && (
      <Dialog open onClose={() => setOpen(false)} titleId='edit-voting-config' title={t('settings.voting.title')} description={t('settings.voting.description')} size='xl'>
      <fetcher.Form method='post'>
        <input type='hidden' name='intent' value='votingConfig' />
        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
          <label className='space-y-1.5'>
            <span className='text-xs font-bold text-foreground'>{t('settings.voting.authMode')}</span>
            <select name='authMode' defaultValue={config.authMode} className={inputClassName}>
              <option value='OTP'>OTP</option>
              <option value='CAPTCHA'>CAPTCHA</option>
              <option value='HYBRID'>HYBRID</option>
            </select>
          </label>
          <NumberField
            name='maxSeriesPerVote'
            value={config.maxSeriesPerVote}
            min={1}
            label={t('settings.voting.maxSeriesPerVote')}
          />
          <NumberField
            name='otpExpirySeconds'
            value={config.otpExpirySeconds}
            min={60}
            label={t('settings.voting.otpExpirySeconds')}
            unit={t('settings.units.seconds')}
          />
          <NumberField
            name='otpMaxAttempts'
            value={config.otpMaxAttempts}
            min={1}
            label={t('settings.voting.otpMaxAttempts')}
          />
          <NumberField name='ipRateLimit' value={config.ipRateLimit} min={1} label={t('settings.voting.ipRateLimit')} />
          <NumberField
            name='phoneRateLimit'
            value={config.phoneRateLimit}
            min={1}
            label={t('settings.voting.phoneRateLimit')}
          />
          <NumberField
            name='otpCooldownSeconds'
            value={config.otpCooldownSeconds}
            min={0}
            label={t('settings.voting.otpCooldownSeconds')}
            unit={t('settings.units.seconds')}
          />
          <NumberField
            name='ipVotesPerPeriod'
            value={config.ipVotesPerPeriod}
            min={1}
            label={t('settings.voting.ipVotesPerPeriod')}
          />
          <NumberField
            name='captchaThreshold'
            value={config.captchaThreshold}
            min={0}
            max={1}
            step={0.05}
            label={t('settings.voting.captchaThreshold')}
          />
        </div>
        <FormFooter fetcher={fetcher} updatedAt={config.updatedAt} />
      </fetcher.Form>
      </Dialog>
      )}
    </>
  )
}

function EditConfigButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type='button'
      onClick={onClick}
      className='inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground'
    >
      <Pencil className='size-4' />
      {label}
    </button>
  )
}

function ConfigCard({
  icon: Icon,
  title,
  description,
  children
}: {
  icon: typeof Settings2
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className='rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6'>
      <div className='flex items-start gap-3'>
        <div className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'>
          <Icon className='size-5' />
        </div>
        <div>
          <h2 className='text-lg font-bold text-foreground'>{title}</h2>
          <p className='mt-1 text-sm leading-6 text-muted-foreground'>{description}</p>
        </div>
      </div>
      <div className='mt-5'>{children}</div>
    </section>
  )
}

function NumberField({
  name,
  value,
  label,
  min,
  max,
  step = 1,
  unit
}: {
  name: string
  value: number
  label: string
  min?: number
  max?: number
  step?: number
  unit?: string
}) {
  return (
    <label className='space-y-1.5'>
      <span className='text-xs font-bold text-foreground'>{label}</span>
      <div className='relative'>
        <input
          name={name}
          type='number'
          required
          defaultValue={value}
          min={min}
          max={max}
          step={step}
          className={`${inputClassName} ${unit ? 'pr-14' : ''}`}
        />
        {unit && (
          <span className='absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground'>
            {unit}
          </span>
        )}
      </div>
    </label>
  )
}

function FormFooter({
  fetcher,
  updatedAt
}: {
  fetcher: ReturnType<typeof useFetcher<AdminSettingsActionResult>>
  updatedAt: string
}) {
  const { t, i18n } = useTranslation('admin')
  const busy = fetcher.state !== 'idle'
  return (
    <div className='mt-5 flex flex-col justify-between gap-3 border-t border-border pt-4 sm:flex-row sm:items-center'>
      <div>
        <p className='text-xs text-muted-foreground'>
          {t('settings.lastUpdated', {
            date: new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(
              new Date(updatedAt)
            )
          })}
        </p>
        {fetcher.data && (
          <p className={`mt-1 text-xs font-bold ${fetcher.data.ok ? 'text-primary' : 'text-destructive'}`}>
            {fetcher.data.ok
              ? t(`settings.messages.${fetcher.data.messageKey}`)
              : t(`settings.errors.${fetcher.data.errorKey ?? 'actionFailed'}`)}
          </p>
        )}
      </div>
      <button
        type='submit'
        disabled={busy}
        className='inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-60'
      >
        {busy ? <Loader2 className='size-4 animate-spin' /> : <Save className='size-4' />}
        {busy ? t('settings.saving') : t('settings.save')}
      </button>
    </div>
  )
}

const inputClassName =
  'h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/20'

function bytesToMb(bytes: number) {
  return Math.round(bytes / 1024 / 1024)
}
