import { ChapterNotificationPage } from '~/features/mangaka'
import { useSearchParams } from 'react-router'

export default function MangakaChapterNotificationRoute({ params }: { params: { id?: string } }) {
  const [searchParams] = useSearchParams()
  const allowCoOwnerDecision = searchParams.get('coOwner') === '1'
  return <ChapterNotificationPage chapterId={params.id ?? ''} allowCoOwnerDecision={allowCoOwnerDecision} />
}
