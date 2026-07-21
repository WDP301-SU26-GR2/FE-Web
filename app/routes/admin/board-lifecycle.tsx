import { redirect } from 'react-router'

/** Legacy entry point. Lifecycle decisions are now prepared inside their Board session. */
export function clientLoader() {
  return redirect('/dashboard/admin/board/sessions')
}

export default function RouteComponent() {
  return null
}
