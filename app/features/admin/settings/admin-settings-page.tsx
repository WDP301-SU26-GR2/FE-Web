import { useEffect, useRef, useState } from 'react'
import { Link, useFetcher } from 'react-router'
import { AlertTriangle, ArrowLeft, Gavel, Loader2, Pencil, Save, Settings2, SlidersHorizontal, Vote } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { AdminSettingsActionResult, AdminSettingsData } from './types'
import { Dialog, useDialogClose } from '~/shared/ui/dialog'

const adminDialogButton =
  'inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg px-4 text-xs font-bold sm:w-auto'
const settingsFieldClass = 'grid min-w-0 grid-rows-[2.5rem_auto] gap-1.5'
const settingsFieldLabelClass = 'flex min-h-10 items-end text-xs font-bold leading-5 text-foreground'

export function AdminSettingsPage({ data, hasError }: { data: AdminSettingsData | null; hasError: boolean }) {
  const { t } = useTranslation('admin')

  if (hasError || !data) {
    return (
      <div className='space-y-6'>
        <AdminDashboardBackLink label={t('navigation.backDashboard')} />
        <div className='rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-destructive' role='alert'>
          <p className='font-bold'>{t('settings.loadError.title')}</p>
          <p className='mt-1 text-xs'>{t('settings.loadError.description')}</p>
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
        <h1 className='mt-2 text-xl font-bold text-foreground md:text-2xl'>{t('settings.title')}</h1>
        <p className='mt-2 max-w-3xl text-xs leading-6 text-muted-foreground'>{t('settings.subtitle')}</p>
      </header>

      <div className='grid gap-6 lg:grid-cols-2'>
        <AppConfigCard data={data} />
        <BoardConfigCard data={data} />
      </div>
      <VotingConfigCard data={data} />
    </div>
  )
}

function AdminDashboardBackLink({ label }: { label: string }) {
  return (
    <Link to='/dashboard/admin' className='inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline'>
      <ArrowLeft className='size-4' />
      {label}
    </Link>
  )
}

function AppConfigCard({ data }: { data: AdminSettingsData }) {
  const { t } = useTranslation('admin')
  const fetcher = useFetcher<AdminSettingsActionResult>()
  const config = data.appConfig
  const [open, setOpen] = useState(false)

  return (
    <>
      <section className='overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md'>
        <div className='flex items-start gap-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent p-5'>
          <div className='flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'>
            <SlidersHorizontal className='size-5' />
          </div>
          <div className='min-w-0 flex-1'>
            <h2 className='text-base font-bold text-foreground'>{t('settings.app.title')}</h2>
            <p className='mt-1 text-xs text-muted-foreground'>{t('settings.app.description')}</p>
          </div>
        </div>
        <div className='p-5'>
          <div className='mb-4 grid grid-cols-2 gap-3'>
            <ConfigStat label={t('settings.app.storyboardMaxReviewRounds')} value={config.storyboardMaxReviewRounds} unit='vòng' />
            <ConfigStat label={t('settings.app.boardRepClaimGraceDays')} value={config.boardRepClaimGraceDays} unit={t('settings.units.days')} />
            <ConfigStat label={t('settings.app.taskOverdueGraceHours')} value={config.taskOverdueGraceHours} unit={t('settings.units.hours')} />
            <ConfigStat label={t('settings.app.hiatusTooLongDays')} value={config.hiatusTooLongDays} unit={t('settings.units.days')} />
          </div>
          <button
            onClick={() => setOpen(true)}
            className='inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md'
          >
            <Pencil className='size-4' />
            {t('settings.edit')}
          </button>
        </div>
      </section>

      {open && (
        <Dialog
          compact
          open
          onClose={() => setOpen(false)}
          titleId='edit-app-config'
          title={t('settings.app.title')}
          description={t('settings.app.description')}
          size='xl'
        >
          <fetcher.Form method='post' className='space-y-5'>
            <input type='hidden' name='intent' value='appConfig' />
            <ConfigSection title={t('settings.app.sections.workflow')}>
              <div className='grid gap-4 sm:grid-cols-2'>
                <NumberField name='coOwnerApprovalGraceDays' value={config.coOwnerApprovalGraceDays} min={0} label={t('settings.app.coOwnerApprovalGraceDays')} unit={t('settings.units.days')} />
                <NumberField name='boardRepClaimGraceDays' value={config.boardRepClaimGraceDays} min={0} label={t('settings.app.boardRepClaimGraceDays')} unit={t('settings.units.days')} />
              </div>
            </ConfigSection>
            <ConfigSection title={t('settings.app.sections.review')}>
              <div className='grid gap-4 sm:grid-cols-2'>
                <NumberField name='storyboardMaxReviewRounds' value={config.storyboardMaxReviewRounds} min={1} label={t('settings.app.storyboardMaxReviewRounds')} />
                <NumberField name='taskOverdueGraceHours' value={config.taskOverdueGraceHours} min={0} max={168} label={t('settings.app.taskOverdueGraceHours')} unit={t('settings.units.hours')} isWarning={config.taskOverdueGraceHours === 0} />
              </div>
            </ConfigSection>
            <ConfigSection title={t('settings.app.sections.quality')}>
              <div className='grid gap-4 sm:grid-cols-2'>
                <NumberField name='reputationRecommendThreshold' value={config.reputationRecommendThreshold} min={1} max={5} step={0.1} label={t('settings.app.reputationRecommendThreshold')} />
                <NumberField name='hiatusTooLongDays' value={config.hiatusTooLongDays} min={1} label={t('settings.app.hiatusTooLongDays')} unit={t('settings.units.days')} />
              </div>
            </ConfigSection>
            <ConfigSection title={t('settings.app.sections.ranking')}>
              <div className='grid gap-4 sm:grid-cols-2'>
                <NumberField name='lowVoteReliabilityThreshold' value={config.lowVoteReliabilityThreshold} min={0} label={t('settings.app.lowVoteReliabilityThreshold')} />
                <NumberField name='rankingAggregateMinCoveragePercent' value={config.rankingAggregateMinCoverageRatio * 100} min={1} max={100} step={1} label={t('settings.app.rankingAggregateMinCoverageRatio')} unit='%' />
              </div>
            </ConfigSection>
            <ConfigSection title={t('settings.app.sections.upload')}>
              <NumberField name='maxUploadMb' value={Math.round(config.maxUploadBytes / 1024 / 1024)} min={1} max={50} step={1} label={t('settings.app.maxUploadBytes')} unit='MB' />
            </ConfigSection>
            <ConfigSection title={t('settings.app.sections.assignment')}>
              <NumberField name='assignmentGraceDays' value={config.assignmentGraceDays} min={0} label={t('settings.app.assignmentGraceDays')} unit={t('settings.units.days')} />
            </ConfigSection>
            <FormFooter fetcher={fetcher} updatedAt={config.updatedAt} />
          </fetcher.Form>
        </Dialog>
      )}
    </>
  )
}

function BoardConfigCard({ data }: { data: AdminSettingsData }) {
  const { t } = useTranslation('admin')
  const fetcher = useFetcher<AdminSettingsActionResult>()
  const config = data.boardConfig
  const [open, setOpen] = useState(false)

  return (
    <>
      <section className='overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md'>
        <div className='flex items-start gap-4 border-b border-border bg-gradient-to-r from-amber-500/5 to-transparent p-5'>
          <div className='flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600'>
            <Gavel className='size-5' />
          </div>
          <div className='min-w-0 flex-1'>
            <h2 className='text-base font-bold text-foreground'>{t('settings.board.title')}</h2>
            <p className='mt-1 text-xs text-muted-foreground'>{t('settings.board.description')}</p>
          </div>
        </div>
        <div className='p-5'>
          <div className='mb-4 grid grid-cols-3 gap-3'>
            <ConfigStat label={t('settings.board.boardTotalMembers')} value={config.boardTotalMembers} />
            <ConfigStat label={t('settings.board.quorumMin')} value={config.quorumMin} />
            <ConfigStat label={t('settings.board.approveMajorityRatio')} value={`${Math.round(config.approveMajorityRatio * 100)}%`} />
          </div>
          <button
            onClick={() => setOpen(true)}
            className='inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-amber-600 hover:shadow-md'
          >
            <Pencil className='size-4' />
            {t('settings.edit')}
          </button>
        </div>
      </section>

      {open && (
        <Dialog
          compact
          open
          onClose={() => setOpen(false)}
          titleId='edit-board-config'
          title={t('settings.board.title')}
          description={t('settings.board.description')}
          size='lg'
        >
          <fetcher.Form method='post' className='space-y-5'>
            <input type='hidden' name='intent' value='boardConfig' />
            <input type='hidden' name='configId' value={config.id} />
            <input type='hidden' name='updatedBy' value={data.currentUserId} />
            <div className='space-y-4'>
              <div className='rounded-lg border border-amber-200 bg-amber-50 p-3'>
                <p className='flex items-center gap-2 text-xs font-medium text-amber-800'>
                  <AlertTriangle className='size-4 shrink-0' />
                  {t('settings.board.lockNotice')}
                </p>
              </div>
              <div className='grid gap-4 sm:grid-cols-3'>
                <NumberField name='boardTotalMembers' value={config.boardTotalMembers} min={3} step={2} label={t('settings.board.boardTotalMembers')} isOdd />
                <NumberField name='quorumMin' value={config.quorumMin} min={1} label={t('settings.board.quorumMin')} />
                <NumberField name='approveMajorityPercent' value={Math.round(config.approveMajorityRatio * 100)} min={1} max={100} label={t('settings.board.approveMajorityRatio')} unit='%' />
              </div>
            </div>
            <FormFooter fetcher={fetcher} updatedAt={config.updatedAt} />
          </fetcher.Form>
        </Dialog>
      )}
    </>
  )
}

function VotingConfigCard({ data }: { data: AdminSettingsData }) {
  const { t } = useTranslation('admin')
  const fetcher = useFetcher<AdminSettingsActionResult>()
  const config = data.votingConfig
  const [open, setOpen] = useState(false)

  return (
    <>
      <section className='overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md'>
        <div className='flex items-start gap-4 border-b border-border bg-gradient-to-r from-emerald-500/5 to-transparent p-5'>
          <div className='flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600'>
            <Vote className='size-5' />
          </div>
          <div className='min-w-0 flex-1'>
            <h2 className='text-base font-bold text-foreground'>{t('settings.voting.title')}</h2>
            <p className='mt-1 text-xs text-muted-foreground'>{t('settings.voting.description')}</p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className='inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 shadow-sm transition-all hover:bg-emerald-100 hover:shadow-md'
          >
            <Pencil className='size-4' />
            {t('settings.edit')}
          </button>
        </div>
        <div className='p-5'>
          <div className='mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4'>
            <ConfigStat label={t('settings.voting.authMode')} value={t(`settings.voting.authModes.${config.authMode}`)} />
            <ConfigStat label={t('settings.voting.maxSeriesPerVote')} value={config.maxSeriesPerVote} />
            <ConfigStat label={t('settings.voting.otpExpirySeconds')} value={`${config.otpExpirySeconds}s`} />
            <ConfigStat label={t('settings.voting.ipRateLimit')} value={config.ipRateLimit} />
          </div>
        </div>
      </section>

      {open && (
        <Dialog
          compact
          open
          onClose={() => setOpen(false)}
          titleId='edit-voting-config'
          title={t('settings.voting.title')}
          description={t('settings.voting.description')}
          size='xl'
        >
          <fetcher.Form method='post' className='space-y-5'>
            <input type='hidden' name='intent' value='votingConfig' />
            <ConfigSection title={t('settings.voting.sections.auth')}>
              <div className='grid gap-4 sm:grid-cols-2'>
                <label className='space-y-1.5'>
                  <span className='text-xs font-bold text-foreground'>{t('settings.voting.authMode')}</span>
                  <select name='authMode' defaultValue={config.authMode} className={inputClassName}>
                    {(['OTP', 'CAPTCHA', 'HYBRID'] as const).map((mode) => (
                      <option key={mode} value={mode}>{t(`settings.voting.authModes.${mode}`)}</option>
                    ))}
                  </select>
                </label>
                <NumberField name='maxSeriesPerVote' value={config.maxSeriesPerVote} min={1} label={t('settings.voting.maxSeriesPerVote')} />
              </div>
            </ConfigSection>
            <ConfigSection title={t('settings.voting.sections.otp')}>
              <div className='grid gap-4 sm:grid-cols-3'>
                <NumberField name='otpExpirySeconds' value={config.otpExpirySeconds} min={60} label={t('settings.voting.otpExpirySeconds')} unit={t('settings.units.seconds')} />
                <NumberField name='otpMaxAttempts' value={config.otpMaxAttempts} min={1} label={t('settings.voting.otpMaxAttempts')} />
                <NumberField name='otpCooldownSeconds' value={config.otpCooldownSeconds} min={0} label={t('settings.voting.otpCooldownSeconds')} unit={t('settings.units.seconds')} />
              </div>
            </ConfigSection>
            <ConfigSection title={t('settings.voting.sections.rateLimit')}>
              <div className='grid gap-4 sm:grid-cols-2'>
                <NumberField name='ipRateLimit' value={config.ipRateLimit} min={1} label={t('settings.voting.ipRateLimit')} />
                <NumberField name='ipVotesPerPeriod' value={config.ipVotesPerPeriod} min={1} label={t('settings.voting.ipVotesPerPeriod')} />
                <NumberField name='phoneRateLimit' value={config.phoneRateLimit} min={1} label={t('settings.voting.phoneRateLimit')} />
                <NumberField name='captchaThreshold' value={config.captchaThreshold} min={0} max={1} step={0.05} label={t('settings.voting.captchaThreshold')} />
              </div>
            </ConfigSection>
            <FormFooter fetcher={fetcher} />
          </fetcher.Form>
        </Dialog>
      )}
    </>
  )
}

function ConfigSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className='space-y-3'>
      <h3 className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>{title}</h3>
      {children}
    </div>
  )
}

function ConfigStat({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className='rounded-lg border border-border bg-muted/30 p-3 text-center'>
      <div className='text-lg font-bold text-foreground'>{value}{unit ? ` ${unit}` : ''}</div>
      <div className='mt-1 text-[10px] text-muted-foreground'>{label}</div>
    </div>
  )
}

function NumberField({
  name,
  value,
  min,
  max,
  step = 1,
  label,
  unit,
  isWarning,
  isOdd
}: {
  name: string
  value: number
  min?: number
  max?: number
  step?: number
  label: string
  unit?: string
  isWarning?: boolean
  isOdd?: boolean
}) {
  return (
    <label className='space-y-1.5'>
      <span className={`text-xs font-bold ${isWarning ? 'text-amber-600' : 'text-foreground'}`}>{label}</span>
      <div className={`relative ${unit ? 'pr-12' : ''}`}>
        <input
          name={name}
          type='number'
          required
          defaultValue={value}
          min={min}
          max={max}
          step={step}
          className={`${inputClassName} ${isWarning ? 'border-amber-400 bg-amber-50 focus:border-amber-500' : ''} ${isOdd ? 'border-amber-400' : ''}`}
        />
        {unit && (
          <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold ${isWarning ? 'text-amber-600' : 'text-muted-foreground'}`}>
            {unit}
          </span>
        )}
      </div>
      {isWarning && (
        <p className='flex items-center gap-1 text-[10px] text-amber-600'>
          <AlertTriangle className='size-3' />
          {unit === 'h' ? 'Công việc quá hạn sẽ bị huỷ ngay' : ''}
        </p>
      )}
    </label>
  )
}

function FormFooter({
  fetcher,
  updatedAt
}: {
  fetcher: ReturnType<typeof useFetcher<AdminSettingsActionResult>>
  updatedAt?: string
}) {
  const { t, i18n } = useTranslation('admin')
  const busy = fetcher.state !== 'idle'
  const closeDialog = useDialogClose()
  const lastData = useRef<AdminSettingsActionResult | undefined>(fetcher.data)

  useEffect(() => {
    const data = fetcher.data
    if (!data || lastData.current === data) return
    lastData.current = data
    const message = data.ok
      ? t(`settings.messages.${data.messageKey}`, { defaultValue: t('settings.messages.appUpdated') })
      : t(`settings.errors.${data.errorKey ?? 'actionFailed'}`)
    if (data.ok) {
      toast.success(message, { id: `admin-settings-${data.intent}-success` })
      closeDialog?.()
    } else toast.error(message, { id: `admin-settings-${data.intent}-error-${data.errorKey ?? ''}` })
  }, [closeDialog, fetcher.data, t])

  return (
    <div className='flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between'>
      {updatedAt && (
        <p className='text-xs text-muted-foreground'>
          {t('settings.lastUpdated', {
            date: new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(updatedAt))
          })}
        </p>
      )}
      <div className='ml-auto'>
        <button
          type='submit'
          disabled={busy}
          className='inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-6 text-xs font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-60'
        >
          {busy ? <Loader2 className='size-4 animate-spin' /> : <Save className='size-4' />}
          {busy ? t('settings.saving') : t('settings.save')}
        </button>
      </div>
    </div>
  )
}

const inputClassName =
  'h-10 w-full rounded-lg border border-input bg-background px-3 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'
