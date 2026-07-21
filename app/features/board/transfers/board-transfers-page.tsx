import { useEffect, useState } from 'react'
import { Form, useFetcher, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { PenLine } from 'lucide-react'
import type { BoardSessionResDtoOutput } from '~/api/model/board'
import type {
  TransferRequestListResDtoOutputDataItem,
  TransferSignatureListResDtoOutputSignaturesItem
} from '~/api/model/transfer'
import {
  BoardActionDialog,
  boardInput,
  BoardFeedback,
  BoardHeader,
  EmptyState,
  StatusBadge
} from '../components/board-ui'
import type { BoardActionResult } from '../types'
import { Dialog } from '~/shared/ui/dialog'

export function BoardTransfersPage({
  requests,
  sessions,
  contractId,
  signatures,
  hasError
}: {
  requests: TransferRequestListResDtoOutputDataItem[]
  sessions: BoardSessionResDtoOutput[]
  contractId: string
  requestId: string
  signatures: TransferSignatureListResDtoOutputSignaturesItem[]
  hasError: boolean
}) {
  const { t } = useTranslation('board')
  const [signOpen, setSignOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const hasMangakaA = signatures.some((signature) => signature.role === 'MANGAKA_A')
  const hasMangakaB = signatures.some((signature) => signature.role === 'MANGAKA_B')
  const hasBoard = signatures.some((signature) => signature.role === 'BOARD')
  const canBoardSign = Boolean(contractId && hasMangakaA && hasMangakaB && !hasBoard)
  const statuses = [...new Set(requests.map((item) => item.status))]
  const filteredRequests = requests.filter(
    (item) =>
      (!search ||
        `${item.series?.title ?? ''} ${item.seriesId} ${item.requestingMangaka?.displayName ?? ''}`
          .toLowerCase()
          .includes(search.toLowerCase())) &&
      (!status || item.status === status)
  )
  return (
    <div className='space-y-6 pb-12'>
      <BoardHeader title={t('transfers.title')} description={t('transfers.description')} />
      <div>
        {canBoardSign ? (
          <button
            type='button'
            onClick={() => setSignOpen(true)}
            className='inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground'
          >
            <PenLine className='h-4 w-4' />
            {t('transfers.sign')}
          </button>
        ) : contractId ? (
          <p className='rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground'>
            {hasBoard
              ? 'Hội đồng đã ký hợp đồng này.'
              : 'Đang chờ đủ chữ ký của Mangaka chuyển giao và Mangaka tiếp nhận.'}
          </p>
        ) : (
          <p className='rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground'>
            Nút ký chỉ xuất hiện khi bạn mở hợp đồng từ thông báo hoặc tải mã hợp đồng ở bên dưới.
          </p>
        )}
      </div>
      {signOpen && <TransferSignDialog contractId={contractId} onClose={() => setSignOpen(false)} />}
      <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
        <h2 className='font-bold text-foreground'>{t('transfers.signatureProgress')}</h2>
        <Form method='get' className='mt-3 grid gap-2 sm:grid-cols-[1fr_auto]'>
          <input
            className={boardInput}
            name='contractId'
            defaultValue={contractId}
            placeholder={t('transfers.contractId')}
            required
          />
          <button className='h-10 rounded-md border border-border px-4 text-sm font-bold'>{t('common.load')}</button>
        </Form>
        {!!signatures.length && (
          <div className='mt-3 grid gap-2'>
            {signatures.map((signature) => (
              <div key={signature.id} className='flex justify-between rounded-lg border border-border p-3 text-sm'>
                <span>{signatureRoleLabel(signature.role)}</span>
                <span>{new Date(signature.signedAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </section>
      {hasError && <p className='text-sm text-destructive'>{t('common.loadError')}</p>}
      <div className='grid gap-2 rounded-xl border border-border bg-card p-4 sm:grid-cols-2'>
        <input
          className={boardInput}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('filters.searchTransfers')}
        />
        <select className={boardInput} value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value=''>{t('filters.allTransferStatuses')}</option>
          {statuses.map((value) => (
            <option key={value} value={value}>
              {t(`filters.transferStatuses.${value}`, { defaultValue: value })}
            </option>
          ))}
        </select>
      </div>
      <div className='grid gap-4'>
        {filteredRequests.map((item) => (
          <TransferCard key={item.id} item={item} sessions={sessions} />
        ))}
      </div>
      {!filteredRequests.length && <EmptyState text={t('transfers.empty')} />}
    </div>
  )
}

function TransferSignDialog({ contractId, onClose }: { contractId: string; onClose: () => void }) {
  const { t } = useTranslation('board')
  const fetcher = useFetcher<BoardActionResult>()

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.ok && fetcher.data.intent === 'sign') onClose()
  }, [fetcher.data, fetcher.state, onClose])

  return (
    <Dialog
      open
      onClose={onClose}
      titleId='board-transfer-sign-title'
      title={t('transfers.sign')}
      description={t('transfers.signInstruction')}
      size='sm'
    >
      <fetcher.Form method='post' className='grid gap-3'>
        <input
          className={boardInput}
          name='contractId'
          defaultValue={contractId}
          placeholder={t('transfers.contractId')}
          required
        />
        <button
          name='intent'
          value='sendOtp'
          formNoValidate
          disabled={fetcher.state !== 'idle'}
          className='h-10 rounded-md border border-border px-3 text-sm font-bold disabled:opacity-60'
        >
          {t('contracts.sendOtp')}
        </button>
        <input
          className={boardInput}
          name='otpCode'
          minLength={6}
          maxLength={6}
          placeholder={t('contracts.otp')}
          required
        />
        <div className='flex justify-end gap-2'>
          <button
            type='button'
            onClick={onClose}
            className='h-10 rounded-md border border-border px-4 text-sm font-bold'
          >
            {t('common.cancel')}
          </button>
          <button
            name='intent'
            value='sign'
            disabled={fetcher.state !== 'idle'}
            className='h-10 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-60'
          >
            {t('transfers.sign')}
          </button>
        </div>
      </fetcher.Form>
      <BoardFeedback data={fetcher.data} />
    </Dialog>
  )
}

function TransferCard({
  item,
  sessions
}: {
  item: TransferRequestListResDtoOutputDataItem
  sessions: BoardSessionResDtoOutput[]
}) {
  const { t } = useTranslation('board')
  const fetcher = useFetcher<BoardActionResult>()
  const navigate = useNavigate()
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.ok && fetcher.data.requestId) {
      navigate(`/dashboard/board/transfers?requestId=${encodeURIComponent(fetcher.data.requestId)}`, { replace: true })
    }
  }, [fetcher.data, fetcher.state, navigate])
  return (
    <article className='rounded-xl border border-border bg-card p-5'>
      <div className='flex justify-between gap-3'>
        <div>
          <strong>{item.series?.title ?? item.seriesId}</strong>
          <p className='mt-1 text-xs text-muted-foreground'>
            {item.proposedType ?? '—'} · {item.requestingMangaka?.displayName ?? item.requestingMangakaId}
          </p>
        </div>
        <StatusBadge value={item.status} />
      </div>
      <p className='mt-3 text-sm text-muted-foreground'>{item.planDescription}</p>
      {item.status === 'SUBMITTED' && (
        <div className='mt-4'>
          <BoardActionDialog title={t('transfers.review')}>
            <fetcher.Form method='post' className='mt-4 grid gap-2 sm:grid-cols-2'>
              <input type='hidden' name='requestId' value={item.id} />
              <select className={boardInput} name='sessionId' required defaultValue=''>
                <option value='' disabled>
                  {t('transfers.session')}
                </option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.title}
                  </option>
                ))}
              </select>
              {!sessions.length && (
                <p className='text-xs text-destructive sm:col-span-2'>
                  Bạn cần thuộc một phiên Hội đồng đang hoạt động để sàng lọc yêu cầu.
                </p>
              )}
              <input className={boardInput} name='details' placeholder={t('transfers.details')} />
              <button
                name='intent'
                value='approve'
                disabled={!sessions.length}
                className='h-10 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground disabled:opacity-50'
              >
                {t('transfers.approve')}
              </button>
              <button
                name='intent'
                value='reject'
                disabled={!sessions.length}
                className='h-10 rounded-md border border-destructive px-3 text-sm font-bold text-destructive disabled:opacity-50'
              >
                {t('transfers.reject')}
              </button>
            </fetcher.Form>
            <BoardFeedback data={fetcher.data} />
          </BoardActionDialog>
        </div>
      )}{' '}
      {item.status === 'UNDER_REVIEW' && item.originalContractType === 'FULL_BUYOUT' && (
        <div className='mt-4'>
          <BoardActionDialog title={t('transfers.fullBuyout')}>
            <FullBuyoutForm itemId={item.id} sessions={sessions} />
          </BoardActionDialog>
        </div>
      )}
    </article>
  )
}

function FullBuyoutForm({ itemId, sessions }: { itemId: string; sessions: BoardSessionResDtoOutput[] }) {
  const { t } = useTranslation('board')
  const fetcher = useFetcher<BoardActionResult>()
  const [conditionCount, setConditionCount] = useState(1)
  return (
    <>
      <fetcher.Form method='post' className='mt-4 grid gap-3'>
        <input type='hidden' name='requestId' value={itemId} />
        <select className={boardInput} name='sessionId' required defaultValue=''>
          <option value='' disabled>
            {t('transfers.session')}
          </option>
          {sessions.map((session) => (
            <option key={session.id} value={session.id}>
              {session.title}
            </option>
          ))}
        </select>
        <input
          className={boardInput}
          name='valuationAmount'
          type='number'
          min={1}
          placeholder={t('contracts.valuation')}
          required
        />
        <div className='space-y-3 rounded-lg border border-border p-3'>
          <div className='flex items-center justify-between gap-2'>
            <strong className='text-sm'>Điều kiện hợp đồng mới</strong>
            <button
              type='button'
              onClick={() => setConditionCount((count) => count + 1)}
              className='text-xs font-bold text-primary'
            >
              + Thêm điều kiện
            </button>
          </div>
          {Array.from({ length: conditionCount }, (_, index) => (
            <div key={index} className='grid gap-2 rounded-md bg-muted/50 p-3 sm:grid-cols-2'>
              <select className={boardInput} name='conditionType' defaultValue='CHAPTER_MILESTONE'>
                <option value='CHAPTER_MILESTONE'>Mốc số chương</option>
                <option value='RECURRING_CHAPTER'>Thanh toán định kỳ theo chương</option>
                <option value='RANKING_MILESTONE'>Mốc xếp hạng</option>
                <option value='TIME_BOUND'>Mốc theo thời hạn</option>
              </select>
              <input
                className={boardInput}
                name='conditionValue'
                type='number'
                min={1}
                placeholder={t('transfers.conditionValue')}
                required
              />
              <input
                className={`${boardInput} sm:col-span-2`}
                name='conditionDescription'
                placeholder={t('transfers.conditionDescription')}
                required
              />
              {conditionCount > 1 && (
                <button
                  type='button'
                  onClick={() => setConditionCount((count) => Math.max(1, count - 1))}
                  className='justify-self-start text-xs font-bold text-destructive'
                >
                  Bỏ điều kiện cuối
                </button>
              )}
            </div>
          ))}
        </div>
        {!sessions.length && (
          <p className='text-xs text-destructive'>Bạn cần thuộc một phiên Hội đồng đang hoạt động để xử lý.</p>
        )}
        <button
          name='intent'
          value='fullBuyout'
          disabled={!sessions.length}
          className='h-10 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground disabled:opacity-50'
        >
          {t('transfers.fullBuyout')}
        </button>
      </fetcher.Form>
      <BoardFeedback data={fetcher.data} />
    </>
  )
}

function signatureRoleLabel(role: string) {
  if (role === 'MANGAKA_A') return 'Mangaka chuyển giao'
  if (role === 'MANGAKA_B') return 'Mangaka tiếp nhận'
  if (role === 'BOARD') return 'Hội đồng'
  return role
}
