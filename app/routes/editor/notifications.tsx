import {
  notificationControllerList,
  notificationControllerMarkAllRead,
  notificationControllerMarkRead
} from '~/api/operations/notifications/notifications'
import { EditorNotificationsPage, type EditorActionResult } from '~/features/editor'
import type { Route } from './+types/notifications'

export async function clientLoader() {
  const response = await notificationControllerList({ limit: 100, offset: 0 })
  return response.data
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<EditorActionResult> {
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')
  try {
    if (intent === 'markAllRead') await notificationControllerMarkAllRead()
    else if (intent === 'markRead') await notificationControllerMarkRead({ id: String(form.get('id') ?? '') })
    else return { ok: false, intent, errorKey: 'invalidAction' }
    return { ok: true, intent, messageKey: 'operationCompleted' }
  } catch {
    return { ok: false, intent, errorKey: 'actionFailed' }
  }
}

export default function EditorNotificationsRoute({ loaderData }: Route.ComponentProps) {
  return <EditorNotificationsPage data={loaderData} />
}
