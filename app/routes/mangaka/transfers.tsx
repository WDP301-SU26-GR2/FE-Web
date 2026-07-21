import { useState } from 'react'
import { ArrowRightLeft, Plus, ShieldCheck } from 'lucide-react'
import { useFetcher } from 'react-router'

import type { PublicSeriesListResDtoOutputItemsItem } from '~/api/model/public'
import type { TransferRequestListResDtoOutputDataItem } from '~/api/model/transfer'
import { authControllerSendOtp } from '~/api/operations/auth/auth'
import { publicControllerListSeries } from '~/api/operations/public/public'
import {
  transferControllerCreateTransferRequest,
  transferControllerGetTransferRequestsByMangaka,
  transferControllerGetSignatures,
  transferControllerMangakaAcceptTransfer,
  transferControllerMangakaRejectTransfer,
  transferControllerSignTransferContract
} from '~/api/operations/transfer/transfer'
import { usersControllerGetMe } from '~/api/operations/users/users'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'
import { Dialog } from '~/shared/ui/dialog'

type ActionResult = { ok: boolean; intent: string; message?: string }

const inputClass = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground'
const statusLabels: Record<string, string> = {
  SUBMITTED: 'Chờ Hội đồng sàng lọc',
  UNDER_REVIEW: 'Đang được xử lý',
  REJECTED_BY_BOARD: 'Hội đồng từ chối',
  NEGOTIATING: 'Chờ Mangaka gốc phản hồi',
  REJECTED_BY_ORIGINAL_MANGAKA: 'Mangaka gốc từ chối',
  PROPOSED: 'Đã đề xuất',
  ACCEPTED: 'Đã hoàn tất chuyển nhượng',
  REJECTED: 'Đã từ chối',
  CANCELLED: 'Đã hủy'
}

export async function clientLoader() {
  const [requestsResponse, seriesResponse, meResponse] = await Promise.all([
    transferControllerGetTransferRequestsByMangaka(),
    publicControllerListSeries({ limit: 50, offset: 0 }),
    usersControllerGetMe()
  ])
  if (seriesResponse.status !== 200 || meResponse.status !== 200) throw new Error('Không thể tải dữ liệu chuyển nhượng.')
  return {
    requests: requestsResponse.data.data,
    series: seriesResponse.data.items.filter((item) =>
      ['SERIALIZED', 'HIATUS', 'COMPLETING', 'CANCELLING'].includes(item.status)
    ),
    currentUserId: meResponse.data.id
  }
}

export async function clientAction({ request }: { request: Request }): Promise<ActionResult> {
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')
  try {
    if (intent === 'create') {
      const proposedType = required(form, 'proposedType') as 'FULL_TRANSFER' | 'PARTIAL_TRANSFER'
      const percentage = String(form.get('proposedPercentage') ?? '').trim()
      await transferControllerCreateTransferRequest({
        seriesId: required(form, 'seriesId'),
        planDescription: required(form, 'planDescription'),
        proposedType,
        proposedPercentage: proposedType === 'PARTIAL_TRANSFER' && percentage ? Number(percentage) : undefined
      })
    } else if (intent === 'accept') {
      await transferControllerMangakaAcceptTransfer({ id: required(form, 'requestId') })
    } else if (intent === 'reject') {
      await transferControllerMangakaRejectTransfer({ id: required(form, 'requestId') })
    } else if (intent === 'sendOtp') {
      const me = await usersControllerGetMe()
      if (me.status !== 200) throw new Error('Không thể tải tài khoản hiện tại.')
      await authControllerSendOtp({ email: me.data.email, purpose: 'SIGNING_CONTRACT' })
    } else if (intent === 'sign') {
      const signerRole = required(form, 'signerRole')
      const contractId = required(form, 'contractId')
      const signatures = await transferControllerGetSignatures({ id: contractId })
      if (signatures.status !== 200) throw new Error('Không thể tải tiến độ chữ ký.')
      if (signerRole === 'MANGAKA_B' && !signatures.data.signatures.some((signature) => signature.role === 'MANGAKA_A')) {
        throw new Error('Mangaka chuyển giao phải ký trước Mangaka tiếp nhận.')
      }
      await transferControllerSignTransferContract(
        { id: contractId },
        { otpCode: required(form, 'otpCode') },
        { signerRole }
      )
    } else {
      return { ok: false, intent, message: 'Thao tác không hợp lệ.' }
    }
    return { ok: true, intent }
  } catch (error) {
    return { ok: false, intent, message: extractApiErrorMessage(error, 'Không thể hoàn tất thao tác chuyển nhượng.') }
  }
}

function required(form: FormData, key: string) {
  const value = String(form.get(key) ?? '').trim()
  if (!value) throw new Error(`Missing ${key}`)
  return value
}

export default function MangakaTransfersRoute({ loaderData }: { loaderData: Awaited<ReturnType<typeof clientLoader>> }) {
  const [createOpen, setCreateOpen] = useState(false)
  const active = loaderData.requests.filter((item) => !['ACCEPTED', 'REJECTED', 'REJECTED_BY_BOARD', 'REJECTED_BY_ORIGINAL_MANGAKA', 'CANCELLED'].includes(item.status))
  const history = loaderData.requests.filter((item) => !active.includes(item))

  return (
    <div className='space-y-6 pb-12'>
      <header className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <p className='flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary'>
            <ArrowRightLeft className='size-4' /> Quy trình chuyển nhượng
          </p>
          <h1 className='mt-2 text-3xl font-bold'>Chuyển nhượng bộ truyện</h1>
          <p className='mt-2 max-w-2xl text-sm text-muted-foreground'>
            Gửi hồ sơ nhận chuyển nhượng, phản hồi đề nghị với tác phẩm của bạn và ký thỏa thuận ba bên.
          </p>
        </div>
        <button type='button' onClick={() => setCreateOpen(true)} className='inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground'>
          <Plus className='size-4' /> Tạo yêu cầu
        </button>
      </header>

      {createOpen && <CreateRequestDialog series={loaderData.series} onClose={() => setCreateOpen(false)} />}

      <RequestSection title='Đang xử lý' items={active} currentUserId={loaderData.currentUserId} />
      <RequestSection title='Lịch sử' items={history} currentUserId={loaderData.currentUserId} />
    </div>
  )
}

function RequestSection({ title, items, currentUserId }: { title: string; items: TransferRequestListResDtoOutputDataItem[]; currentUserId: string }) {
  return (
    <section className='space-y-3'>
      <h2 className='text-lg font-bold'>{title} <span className='text-sm font-normal text-muted-foreground'>({items.length})</span></h2>
      <div className='grid gap-4'>
        {items.map((item) => <TransferRequestCard key={item.id} item={item} currentUserId={currentUserId} />)}
        {!items.length && <p className='rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground'>Không có yêu cầu trong nhóm này.</p>}
      </div>
    </section>
  )
}

function TransferRequestCard({ item, currentUserId }: { item: TransferRequestListResDtoOutputDataItem; currentUserId: string }) {
  const fetcher = useFetcher<ActionResult>()
  const [signOpen, setSignOpen] = useState(false)
  const isOriginalMangaka = item.originalMangakaId === currentUserId
  const canRespond = isOriginalMangaka && item.status === 'NEGOTIATING'
  const canSign = ['UNDER_REVIEW', 'ACCEPTED'].includes(item.status)
  const signerRole = isOriginalMangaka ? 'MANGAKA_A' : 'MANGAKA_B'

  return (
    <article className='rounded-xl border border-border bg-card p-5 shadow-sm'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h3 className='font-bold'>{item.series?.title ?? 'Bộ truyện chưa xác định'}</h3>
          <p className='mt-1 text-xs text-muted-foreground'>
            {item.proposedType === 'PARTIAL_TRANSFER' ? 'Chuyển nhượng một phần' : 'Chuyển nhượng toàn bộ'} · Người đề nghị: {item.requestingMangaka?.displayName ?? 'Chưa xác định'}
          </p>
        </div>
        <span className='rounded-full bg-secondary px-2.5 py-1 text-xs font-bold'>{statusLabels[item.status] ?? item.status}</span>
      </div>
      <p className='mt-3 text-sm text-muted-foreground'>{item.planDescription}</p>
      {item.proposedPercentage != null && <p className='mt-2 text-sm'>Tỷ lệ đề xuất: <strong>{item.proposedPercentage}%</strong></p>}

      {(canRespond || canSign) && (
        <div className='mt-4 flex flex-wrap gap-2 border-t border-border pt-4'>
          {canRespond && (
            <fetcher.Form method='post' className='flex gap-2'>
              <input type='hidden' name='requestId' value={item.id} />
              <button name='intent' value='accept' className='h-9 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground'>Đồng ý thương lượng</button>
              <button name='intent' value='reject' className='h-9 rounded-md border border-destructive px-3 text-sm font-bold text-destructive'>Từ chối</button>
            </fetcher.Form>
          )}
          {canSign && <button type='button' onClick={() => setSignOpen(true)} className='inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-bold'><ShieldCheck className='size-4' /> Ký hợp đồng chuyển nhượng</button>}
        </div>
      )}
      {fetcher.data && <p className={`mt-3 text-sm font-semibold ${fetcher.data.ok ? 'text-primary' : 'text-destructive'}`}>{fetcher.data.ok ? 'Đã cập nhật yêu cầu.' : fetcher.data.message}</p>}
      {signOpen && <SignDialog signerRole={signerRole} onClose={() => setSignOpen(false)} />}
    </article>
  )
}

function CreateRequestDialog({ series, onClose }: { series: PublicSeriesListResDtoOutputItemsItem[]; onClose: () => void }) {
  const fetcher = useFetcher<ActionResult>()
  const [type, setType] = useState<'FULL_TRANSFER' | 'PARTIAL_TRANSFER'>('FULL_TRANSFER')
  return (
    <Dialog open onClose={onClose} titleId='create-transfer-request' title='Tạo yêu cầu chuyển nhượng' description='Chọn bộ truyện theo tên và trình bày kế hoạch tiếp quản.' size='lg'>
      <fetcher.Form method='post' className='grid gap-3'>
        <select name='seriesId' required defaultValue='' className={inputClass}>
          <option value='' disabled>Chọn bộ truyện</option>
          {series.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
        <select name='proposedType' value={type} onChange={(event) => setType(event.target.value as typeof type)} className={inputClass}>
          <option value='FULL_TRANSFER'>Nhận chuyển nhượng toàn bộ</option>
          <option value='PARTIAL_TRANSFER'>Nhận chuyển nhượng một phần</option>
        </select>
        {type === 'PARTIAL_TRANSFER' && <input name='proposedPercentage' type='number' min={1} max={99} required className={inputClass} placeholder='Tỷ lệ muốn nhận (%)' />}
        <textarea name='planDescription' required minLength={1} rows={5} className='w-full rounded-md border border-input bg-background p-3 text-sm' placeholder='Kế hoạch tiếp quản và phát triển bộ truyện' />
        <div className='flex justify-end gap-2'>
          <button type='button' onClick={onClose} className='h-10 rounded-md border border-border px-4 text-sm font-bold'>Hủy</button>
          <button name='intent' value='create' disabled={fetcher.state !== 'idle'} className='h-10 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50'>Gửi yêu cầu</button>
        </div>
      </fetcher.Form>
      {fetcher.data && <p className={`mt-3 text-sm ${fetcher.data.ok ? 'text-primary' : 'text-destructive'}`}>{fetcher.data.ok ? 'Đã gửi yêu cầu chuyển nhượng.' : fetcher.data.message}</p>}
    </Dialog>
  )
}

function SignDialog({ signerRole, onClose }: { signerRole: 'MANGAKA_A' | 'MANGAKA_B'; onClose: () => void }) {
  const fetcher = useFetcher<ActionResult>()
  return (
    <Dialog open onClose={onClose} titleId='sign-transfer-contract' title='Ký hợp đồng chuyển nhượng' description={`Bạn đang ký với vai trò ${signerRole === 'MANGAKA_A' ? 'Mangaka chuyển giao' : 'Mangaka tiếp nhận'}. ${signerRole === 'MANGAKA_B' ? 'Mangaka chuyển giao phải ký trước.' : ''}`} size='sm'>
      <fetcher.Form method='post' className='grid gap-3'>
        <input type='hidden' name='signerRole' value={signerRole} />
        <input name='contractId' required className={inputClass} placeholder='Mã hợp đồng từ thông báo' />
        <button name='intent' value='sendOtp' formNoValidate className='h-10 rounded-md border border-border px-3 text-sm font-bold'>Gửi mã OTP</button>
        <input name='otpCode' required inputMode='numeric' pattern='[0-9]{6}' minLength={6} maxLength={6} className={inputClass} placeholder='Mã OTP gồm 6 số' />
        <div className='flex justify-end gap-2'>
          <button type='button' onClick={onClose} className='h-10 rounded-md border border-border px-4 text-sm font-bold'>Hủy</button>
          <button name='intent' value='sign' disabled={fetcher.state !== 'idle'} className='h-10 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50'>Xác nhận ký</button>
        </div>
      </fetcher.Form>
      {fetcher.data && <p className={`mt-3 text-sm ${fetcher.data.ok ? 'text-primary' : 'text-destructive'}`}>{fetcher.data.ok ? 'Thao tác thành công.' : fetcher.data.message}</p>}
    </Dialog>
  )
}
