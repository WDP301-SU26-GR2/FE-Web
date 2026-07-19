import { BoardReportsPage } from '~/features/board'
import { clientLoader as boardReportsLoader } from '../board/reports'
import type { Route } from './+types/board-reports'

export const clientLoader = boardReportsLoader

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return (
    <BoardReportsPage
      {...loaderData}
      backPath='/dashboard/admin/board'
      decisionBasePath='/dashboard/admin/board/decisions'
      enableFilters
    />
  )
}
