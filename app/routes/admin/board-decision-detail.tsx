import { BoardDecisionDetailPage } from '~/features/board'
import { clientLoader as boardDecisionLoader } from '../board/decision-detail'

export const clientLoader = boardDecisionLoader

export default function AdminBoardDecisionDetailRoute({
  loaderData
}: {
  loaderData: Awaited<ReturnType<typeof clientLoader>>
}) {
  return <BoardDecisionDetailPage {...loaderData} readOnly backPath='/dashboard/admin/board/decisions' />
}
