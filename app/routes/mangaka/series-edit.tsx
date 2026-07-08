import { EditProposalPage } from '~/features/mangaka'
import type { Route } from './+types/series-edit'

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: 'Edit Proposal - MangakaStudio Pro' },
    {
      name: 'description',
      content: `Sửa proposal cho series ${params.id}`
    }
  ]
}

export default function DashboardSeriesEditRoute({ params }: Route.ComponentProps) {
  return <EditProposalPage seriesId={params.id} />
}