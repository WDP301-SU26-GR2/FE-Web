import { CreateProposalWizard } from '~/features/mangaka'
import type { Route } from './+types/propose-series'

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Propose New Series - MangakaStudio Pro' },
    { name: 'description', content: 'Tạo proposal series mới' }
  ]
}

export default function DashboardProposeSeriesRoute() {
  return <CreateProposalWizard />
}