import { redirect } from 'react-router'

/**
 * Legacy entry point. Series pitching now belongs to a specific Board session,
 * so old bookmarks are sent to the session list instead of exposing a second workflow.
 */
export function clientLoader() {
  return redirect('/dashboard/editor/board/sessions')
}

export default function RouteComponent() {
  return null
}
