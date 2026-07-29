import { CreateProposalWizard, mangakaRouteMeta } from '~/features/mangaka'
import type { Route } from './+types/propose-series'

export function meta({}: Route.MetaArgs) {
  return mangakaRouteMeta('routeMeta.proposeSeries.title', 'routeMeta.proposeSeries.description')
}

export default function DashboardProposeSeriesRoute() {
  return <CreateProposalWizard />
}
