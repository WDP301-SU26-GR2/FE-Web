import { EditProposalPage, mangakaRouteMeta } from '~/features/mangaka'
import type { Route } from './+types/series-edit'

export function meta({}: Route.MetaArgs) {
  return mangakaRouteMeta('routeMeta.seriesEdit.title', 'routeMeta.seriesEdit.description')
}

export default function DashboardSeriesEditRoute({ params }: Route.ComponentProps) {
  return <EditProposalPage seriesId={params.id} />
}
