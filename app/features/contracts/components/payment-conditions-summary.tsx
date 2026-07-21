import type { PaymentConditionListResDtoOutputDataItem } from '~/api/model/contracts'

export function PaymentConditionsSummary({
  conditions,
  loadFailed = false
}: {
  conditions: PaymentConditionListResDtoOutputDataItem[]
  loadFailed?: boolean
}) {
  if (loadFailed)
    return (
      <p className='rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm font-semibold text-destructive'>
        Không thể tải điều kiện thanh toán. Các thao tác duyệt và ký đã được khóa để bảo đảm an toàn.
      </p>
    )

  if (!conditions.length)
    return (
      <p className='rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground'>
        Hợp đồng chưa có điều kiện thanh toán.
      </p>
    )

  return (
    <div className='space-y-3'>
      {conditions.map((condition) => {
        const validPayout = (condition.payoutAmount ?? 0) > 0 || (condition.payoutPct ?? 0) > 0
        return (
          <article key={condition.id} className='rounded-lg border border-border p-4'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <strong className='text-sm text-foreground'>{conditionTypeLabel(condition.conditionType)}</strong>
              <span className='rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-secondary-foreground'>
                {conditionStatusLabel(condition.status)}
              </span>
            </div>
            <dl className='mt-3 grid gap-3 text-xs sm:grid-cols-2'>
              <Fact label='Điều kiện đạt' value={thresholdLabel(condition.conditionType, condition.thresholdConfig)} />
              <Fact label='Số tiền chi trả' value={formatAmount(condition.payoutAmount)} />
              <Fact label='Phần trăm chi trả' value={formatPercent(condition.payoutPct)} />
              <Fact label='Cơ chế lặp' value={condition.isRecurring ? 'Có lặp lại' : 'Chỉ áp dụng một lần'} />
              {condition.lastTriggeredValue != null && (
                <Fact label='Giá trị đã kích hoạt gần nhất' value={formatAmount(condition.lastTriggeredValue)} />
              )}
              {condition.achievedAt && <Fact label='Thời điểm đạt' value={formatDate(condition.achievedAt)} />}
            </dl>
            {!validPayout && (
              <p className='mt-3 text-xs font-semibold text-destructive'>Điều kiện này chưa có giá trị chi trả hợp lệ.</p>
            )}
          </article>
        )
      })}
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className='text-muted-foreground'>{label}</dt>
      <dd className='mt-1 font-semibold text-foreground'>{value}</dd>
    </div>
  )
}

function conditionTypeLabel(type: string) {
  if (type === 'CHAPTER_MILESTONE') return 'Mốc số chương'
  if (type === 'RECURRING_CHAPTER') return 'Chi trả định kỳ theo chương'
  if (type === 'RANKING_MILESTONE') return 'Mốc xếp hạng'
  if (type === 'TIME_BOUND') return 'Mốc thời hạn'
  return type.replaceAll('_', ' ')
}

function conditionStatusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: 'Đang theo dõi',
    ACHIEVED: 'Đã đạt',
    PAID: 'Đã chi trả',
    CANCELLED: 'Đã hủy',
    MISSED: 'Không đạt',
    DISABLED: 'Đang tạm dừng'
  }
  return labels[status] ?? status.replaceAll('_', ' ')
}

function thresholdLabel(type: string, rawConfig: unknown) {
  const config = asRecord(rawConfig)
  if (type === 'CHAPTER_MILESTONE') return `Đạt ${numberValue(config.chapter)} chương đã xuất bản`
  if (type === 'RECURRING_CHAPTER') return `Sau mỗi ${numberValue(config.every)} chương đã xuất bản`
  if (type === 'RANKING_MILESTONE') return `Đạt top ${numberValue(config.topRank)} bảng xếp hạng`
  if (type === 'TIME_BOUND') return `Hoàn thành trước ${textValue(config.deadline)}`
  return 'Theo cấu hình hợp đồng'
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? new Intl.NumberFormat('vi-VN').format(value) : '—'
}

function textValue(value: unknown) {
  return typeof value === 'string' && value ? value : '—'
}

function formatAmount(value: number | null) {
  return value == null ? 'Không áp dụng' : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value)
}

function formatPercent(value: number | null) {
  return value == null ? 'Không áp dụng' : `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value)}%`
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN')
}
