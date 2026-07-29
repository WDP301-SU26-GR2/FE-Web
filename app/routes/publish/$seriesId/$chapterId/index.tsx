import { Navigate } from 'react-router'

import { usePublicationContext } from '~/features/mangaka/publication/publication-shell-context'

/**
 * Sends a new chapter to Name, but opens an approved chapter directly in the
 * Pages workbench. This makes the production-stage workflow the default
 * workspace once the storyboard is ready for production.
 */
export default function ChapterIndex() {
  const { seriesId, chapterId, name, nameLoading } = usePublicationContext()

  if (nameLoading) return null

  const tab = name?.status === 'APPROVED' ? 'pages' : 'name'
  return <Navigate replace to={`/publish/${seriesId}/${chapterId}/${tab}`} />
}
