import {
  boardControllerCreateSeriesReport,
  boardControllerCastVote,
  boardControllerGetDecisionDetails,
  boardControllerGetSessionById
} from '~/api/operations/board/board'
import { seriesControllerGetSeries } from '~/api/operations/series/series'
import { tankobonControllerDashboard } from '~/api/operations/tankobon/tankobon'
import type { SeriesResDtoOutput } from '~/api/model/series'
import type { DefenseDashboardResDtoOutput } from '~/api/model/tankobon'
import { readBoardSessionPhase } from '~/api/manual/board-meeting'
import { BoardDecisionDetailPage, type BoardActionResult } from '~/features/board'
import { extractApiErrorMessage, extractApiSuccessMessage } from '~/shared/lib/api/extract-api-error'
import { loadBoardDecisionDetail } from '../board/decision-detail-loader'
import type { ClientActionFunctionArgs, ClientLoaderFunctionArgs } from 'react-router'

export async function clientLoader({ params }: ClientLoaderFunctionArgs) {
  const id = requiredParam(params.id)
  return loadBoardDecisionDetail(id)
}

export async function clientAction({ request, params }: ClientActionFunctionArgs): Promise<BoardActionResult> {
  const id = requiredParam(params.id)
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')
  try {
    if (intent === 'createReport') {
      const decision = await boardControllerGetDecisionDetails({ id })
      if (decision.status !== 200 || !decision.data.targetSeriesId) return { ok: false, intent }
      const session = await boardControllerGetSessionById({ id: decision.data.boardSessionId })
      if (session.status !== 200 || session.data.status === 'CONCLUDED') return { ok: false, intent }
      const note = String(form.get('content') ?? '').trim()
      const evidenceSections = readEvidenceSections(form)
      if (!note && evidenceSections.length === 0) {
        return {
          ok: false,
          intent,
          message: 'Hãy chọn ít nhất một nguồn dữ liệu hoặc nhập nhận định biên tập.'
        }
      }
      const needsDashboard = evidenceSections.some((section) => section !== 'LIFECYCLE')
      const [series, defense] = await Promise.all([
        seriesControllerGetSeries({ id: decision.data.targetSeriesId }),
        needsDashboard
          ? tankobonControllerDashboard({ id: decision.data.targetSeriesId }).catch(() => null)
          : Promise.resolve(null)
      ])
      if (series.status !== 200) return { ok: false, intent }
      if (needsDashboard && defense?.status !== 200) {
        return {
          ok: false,
          intent,
          message: 'Không thể tải dữ liệu đã chọn. Vui lòng thử lại để báo cáo không lưu snapshot thiếu.'
        }
      }
      const reportContent = buildReportContent(
        evidenceSections,
        note,
        series.data,
        defense?.status === 200 ? defense.data : null
      )
      const response = await boardControllerCreateSeriesReport({
        seriesId: decision.data.targetSeriesId,
        boardDecisionId: id,
        reportType: requiredValue(form, 'reportType'),
        content: reportContent,
        attachments: String(form.get('attachments') ?? '')
          .split(/[\n,]/)
          .map((item) => item.trim())
          .filter(Boolean)
      })
      return {
        ok: true,
        intent,
        messageKey: 'reportCreated',
        message: extractApiSuccessMessage(response, 'Đã thêm báo cáo vào quyết định.')
      }
    }
    if (intent !== 'vote') return { ok: false, intent }
    const decision = await boardControllerGetDecisionDetails({ id })
    if (decision.status !== 200) return { ok: false, intent }
    const session = await boardControllerGetSessionById({ id: decision.data.boardSessionId })
    if (session.status !== 200 || session.data.status !== 'ACTIVE' || readBoardSessionPhase(session.data) !== 'VOTING')
      return { ok: false, intent }
    await boardControllerCastVote(
      { id },
      {
        voteValue: String(form.get('voteValue')) as 'APPROVE' | 'REJECT' | 'ABSTAIN',
        note: String(form.get('note') ?? '') || undefined
      }
    )
    return { ok: true, intent, messageKey: 'voteSubmitted' }
  } catch (error) {
    return {
      ok: false,
      intent,
      message: extractApiErrorMessage(error, 'Không thể hoàn tất thao tác với quyết định.')
    }
  }
}

function requiredParam(value: string | undefined) {
  if (!value) throw new Response('Not found', { status: 404 })
  return value
}

export default function RouteComponent({ loaderData }: { loaderData: Awaited<ReturnType<typeof clientLoader>> }) {
  const seriesId = loaderData.decision.targetSeriesId
  const lifecycleHref = seriesId
    ? `/dashboard/editor/operations/lifecycle?seriesId=${encodeURIComponent(seriesId)}&decisionId=${encodeURIComponent(loaderData.decision.id)}`
    : undefined

  return (
    <BoardDecisionDetailPage
      {...loaderData}
      canCreateReport
      lifecycleHref={lifecycleHref}
      backPath={`/dashboard/editor/board/sessions/${loaderData.decision.boardSessionId}`}
    />
  )
}

function requiredValue(form: FormData, key: string) {
  const value = String(form.get(key) ?? '').trim()
  if (!value) throw new Error(`Missing ${key}`)
  return value
}

const evidenceSectionValues = ['LIFECYCLE', 'SERIALIZATION', 'SALES', 'RANKING'] as const
type EvidenceSection = (typeof evidenceSectionValues)[number]

function readEvidenceSections(form: FormData): EvidenceSection[] {
  const allowed = new Set<string>(evidenceSectionValues)
  return [
    ...new Set(
      form
        .getAll('evidenceSections')
        .map(String)
        .filter((value) => allowed.has(value))
    )
  ] as EvidenceSection[]
}

function buildReportContent(
  sections: EvidenceSection[],
  note: string,
  series: SeriesResDtoOutput,
  defense: DefenseDashboardResDtoOutput | null
) {
  const blocks = [`[Snapshot dữ liệu hệ thống · ${new Date().toISOString()}]`, `Series: ${series.title}`]

  if (sections.includes('LIFECYCLE')) {
    blocks.push(
      [
        '## Trạng thái vòng đời',
        `- Trạng thái hiện tại: ${series.status}`,
        `- Lý do trạng thái gần nhất: ${series.statusReason || 'Không có'}`,
        `- Nhịp phát hành: ${series.publicationType || 'Chưa xác định'}`,
        `- Tạp chí: ${series.magazine || 'Chưa xác định'}`,
        `- Số kỳ bắt đầu: ${series.startIssueNumber ?? 'Chưa xác định'}`
      ].join('\n')
    )
  }

  if (sections.includes('SERIALIZATION')) {
    blocks.push(
      defense
        ? [
            '## Tiến độ xuất bản',
            `- Số chương đã xuất bản: ${defense.serialization.chaptersPublished}`,
            `- Bắt đầu đăng dài kỳ: ${defense.serialization.serializedSince || 'Chưa có dữ liệu'}`
          ].join('\n')
        : '## Tiến độ xuất bản\n- Dữ liệu hiện không khả dụng'
    )
  }

  if (sections.includes('SALES')) {
    const recentVolumes = defense?.tankobon.volumes
      .slice(-5)
      .map((volume) => `- Tập ${volume.volumeNumber}: ${volume.unitsSold} bản (${volume.period})`)
    blocks.push(
      defense
        ? [
            '## Doanh số tankobon',
            `- Tổng số bản bán: ${defense.tankobon.totalUnitsSold}`,
            `- Số tập có dữ liệu: ${defense.tankobon.volumes.length}`,
            ...(recentVolumes?.length ? ['- Các tập gần nhất:', ...recentVolumes] : [])
          ].join('\n')
        : '## Doanh số tankobon\n- Dữ liệu hiện không khả dụng'
    )
  }

  if (sections.includes('RANKING')) {
    const rankingLines = defense?.rankingTrend
      .slice(-5)
      .map(
        (item) =>
          `- ${item.recordedAt}: hạng ${item.rankPosition ?? '—'}, ${item.voteCount} phiếu, thay đổi ${
            item.rankChange ?? '—'
          }, rủi ro ${item.riskLevel}`
      )
    blocks.push(
      rankingLines?.length
        ? ['## Xếp hạng và rủi ro', ...rankingLines].join('\n')
        : '## Xếp hạng và rủi ro\n- Dữ liệu hiện không khả dụng'
    )
  }

  if (note) blocks.push(`## Nhận định biên tập\n${note}`)
  return blocks.join('\n\n').slice(0, 5000)
}
