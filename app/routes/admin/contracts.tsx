import { useState } from 'react'
import { ArrowLeft, FileText, MessageSquareText, UserCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useFetcher } from 'react-router'
import type { AssignRepresentativeBodyDto, ContractListItemDtoOutput } from '~/api/model/contracts'
import { contractControllerAssignRepresentative } from '~/api/operations/contracts/contracts'
import { customFetch } from '~/api/mutator/custom-fetch'
import type { AdminUserListResDtoOutputItemsItem } from '~/api/model/users'
import { usersControllerListUsers } from '~/api/operations/users/users'
import { extractApiErrorCode, extractApiErrorMessage, extractApiSuccessMessage } from '~/shared/lib/api/extract-api-error'
import type { Route } from './+types/contracts'

export function meta() {
  return [{ title: 'Contract Oversight - MangaStudio Pro' }]
}

async function loadContractsByStatus(status: string): Promise<ContractListItemDtoOutput[]> {
  const res = await customFetch<{ success: boolean; data: ContractListItemDtoOutput[] }>(
    `/contracts?status=${encodeURIComponent(status)}`
  )
  return res.data
}

export async function clientLoader() {
  try {
    const [contracts, boardMembersResponse] = await Promise.all([
      loadContractsByStatus('BOARD_REVIEW'),
      usersControllerListUsers({ roleCode: 'BOARD_MEMBER', limit: 100 })
    ])
    return {
      contracts,
      boardMembers: boardMembersResponse.data.items,
      hasError: false
    }
  } catch {
    return { contracts: null, boardMembers: [], hasError: true }
  }
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<AssignResult> {
  const formData = await request.formData()
  const contractId = String(formData.get('contractId') ?? '')
  const representativeId = String(formData.get('representativeId') ?? '')

  if (!contractId || !representativeId) {
    return { ok: false, message: 'Missing required fields.' }
  }

  try {
    const response = await contractControllerAssignRepresentative(
      { id: contractId },
      { representativeId } satisfies AssignRepresentativeBodyDto
    )
    return {
      ok: true,
      message: extractApiSuccessMessage(response, 'Đã gán đại diện thành công.'),
      contractId
    }
  } catch (error) {
    const code = extractApiErrorCode(error)
    let message = extractApiErrorMessage(error, 'Không thể gán đại diện. Vui lòng kiểm tra lại thông tin.')
    if (code === 'Error.NotInContractBoardRoster') {
      message = 'Thành viên được chọn không nằm trong danh sách phê duyệt của Hội đồng.'
    }
    if (code === 'Error.ContractNotInBoardReview') {
      message = 'Hợp đồng không còn ở trạng thái BOARD_REVIEW.'
    }
    return { ok: false, message }
  }
}

type AssignResult = { ok: true; message: string; contractId: string } | { ok: false; message: string }

export default function AdminContractsRoute({ loaderData }: Route.ComponentProps) {
  const { t, i18n } = useTranslation('admin')
  const fetcher = useFetcher<AssignResult>()

  const { contracts, boardMembers, hasError } = loaderData

  if (hasError || !contracts) {
    return (
      <div className="mx-auto max-w-3xl space-y-5 py-8">
        <Link to="/dashboard/admin" className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline">
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t('navigation.backDashboard')}
        </Link>
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-8 text-center text-destructive">
          <h1 className="text-base font-bold">{t('contracts.loadError.title')}</h1>
          <p className="mt-2 text-xs">{t('contracts.loadError.description')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <Link to="/dashboard/admin" className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t('navigation.backDashboard')}
      </Link>

      <header className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="h-20 bg-primary/10" />
        <div className="px-6 pb-6 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{t('contracts.eyebrow')}</p>
              <h1 className="mt-1 text-xl font-bold tracking-tight text-foreground">{t('contracts.title')}</h1>
              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground">{t('contracts.subtitle')}</p>
            </div>
          </div>
        </div>
      </header>

      {contracts.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <FileText className="mx-auto size-10 text-muted-foreground/50" aria-hidden="true" />
          <h2 className="mt-4 text-sm font-bold text-foreground">{t('contracts.empty.title')}</h2>
          <p className="mt-2 text-xs text-muted-foreground">{t('contracts.empty.description')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map((contract) => (
            <ContractRow
              key={contract.id}
              contract={contract}
              boardMembers={boardMembers}
              fetcher={fetcher}
              actionData={fetcher.data}
              t={t}
              i18n={i18n}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface ContractRowProps {
  contract: ContractListItemDtoOutput
  boardMembers: AdminUserListResDtoOutputItemsItem[]
  fetcher: ReturnType<typeof useFetcher<AssignResult>>
  actionData?: AssignResult
  t: ReturnType<typeof useTranslation<'admin'>>['t']
  i18n: ReturnType<typeof useTranslation<'admin'>>['i18n']
}

function ContractRow({ contract, boardMembers, fetcher, actionData, t, i18n }: ContractRowProps) {
  const [selectedRep, setSelectedRep] = useState('')
  const isSubmitting = fetcher.state !== 'idle'
  const seriesName = contract.series?.title ?? contract.seriesId

  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-foreground">{seriesName}</h3>
            <span className="rounded-md border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t(`contracts.status.${contract.contractType}`)}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              <span className="font-medium">{t('contracts.table.mangaka')}:</span>{' '}
              {contract.mangaka?.displayName ?? '—'}
            </span>
            <span>
              <span className="font-medium">{t('contracts.table.editor')}:</span>{' '}
              {contract.editor?.displayName ?? '—'}
            </span>
            <span>
              <span className="font-medium">{t('contracts.table.createdAt')}:</span> {fmtDate(contract.createdAt)}
            </span>
            <span>
              <span className="font-medium">ID:</span>{' '}
              <code className="text-[10px]">{contract.id}</code>
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <Link
            to={`/dashboard/admin/contracts/${contract.id}/comments`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/70"
          >
            <MessageSquareText className="size-3.5" aria-hidden="true" />
            {t('contracts.table.comments')}
          </Link>

          <fetcher.Form method="post">
            <input type="hidden" name="contractId" value={contract.id} />
            <div className="flex items-center gap-2">
              <div className="relative">
                <UserCheck className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <select
                  name="representativeId"
                  value={selectedRep}
                  onChange={(e) => setSelectedRep(e.target.value)}
                  disabled={isSubmitting}
                  className="min-w-[180px] appearance-none rounded-lg border border-border bg-background py-2 pl-8 pr-8 text-xs text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">{t('contracts.assign.placeholder')}</option>
                  {boardMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.displayName ?? member.name}
                    </option>
                  ))}
                </select>
                <svg
                  className="pointer-events-none absolute right-2.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !selectedRep}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <svg className="size-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <UserCheck className="size-3.5" aria-hidden="true" />
                )}
                {t('contracts.assign.button')}
              </button>
            </div>
          </fetcher.Form>
        </div>
      </div>

      <ActionFeedback
        actionData={actionData}
        contractId={contract.id}
        t={t}
      />
    </div>
  )
}

interface ActionFeedbackProps {
  actionData?: AssignResult
  contractId: string
  t: ReturnType<typeof useTranslation<'admin'>>['t']
}

function ActionFeedback({ actionData, contractId, t }: ActionFeedbackProps) {
  if (!actionData) return null

  if (actionData.ok) {
    if (actionData.contractId !== contractId) return null
    return (
      <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
        <p className="text-xs font-medium text-emerald-700">{actionData.message}</p>
      </div>
    )
  }

  return (
    <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
      <p className="text-xs font-medium text-destructive">{actionData.message}</p>
    </div>
  )
}
