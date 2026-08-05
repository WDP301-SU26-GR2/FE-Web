import { EditorBoardPage } from '~/features/editor'
import { SITE } from '~/shared/config/site'

export function meta() {
  return [{ title: SITE.name }]
}

export default function EditorBoardRoute() {
  return <EditorBoardPage />
}
