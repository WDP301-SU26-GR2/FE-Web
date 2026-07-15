import { PublicationWorkbench } from '~/features/mangaka'
import type { Route } from './+types/$chapterId'

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: 'Publication Workbench - MangakaStudio Pro' },
    {
      name: 'description',
      content: `Publication workbench for chapter ${params.chapterId}`
    }
  ]
}

export default function PublishChapterRoute({ params }: Route.ComponentProps) {
  return <PublicationWorkbench seriesId={params.seriesId} chapterId={params.chapterId} />
}
