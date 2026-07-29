import { useParams } from 'react-router'

import { PublicationShell } from '~/features/mangaka/publication/publication-shell'
import { RoleDashboardGuard } from '~/shared/components'

/**
 * Layout for `/publish/:seriesId/:chapterId/*`. Lifts chapter/name/pages
 * fetches into a shared `usePublicationData()` and exposes them to its child
 * routes (`index.tsx`, `name.tsx`, `pages.tsx`) via `<PublicationContext />`.
 *
 * The shell internally renders an `<Outlet />`, so this wrapper only needs to
 * read the URL params and hand them to the shell.
 */
export default function PublishChapterLayout() {
  const params = useParams()
  return (
    <RoleDashboardGuard role='MANGAKA'>
      <PublicationShell
        params={{
          seriesId: params.seriesId ?? '',
          chapterId: params.chapterId ?? ''
        }}
      />
    </RoleDashboardGuard>
  )
}
