import {
  notificationControllerList,
  notificationControllerMarkAllRead,
  notificationControllerMarkRead
} from '~/api/operations/notifications/notifications'
import { BoardNotificationsPage, type BoardActionResult } from '~/features/board'
import type { Route } from './+types/notifications'

export async function clientLoader() {
  const response = await notificationControllerList({ limit: 100, offset: 0 })
  return response.data
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<BoardActionResult> {
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')
  try {
    if (intent === 'all') await notificationControllerMarkAllRead()
    else if (intent === 'read') await notificationControllerMarkRead({ id: String(form.get('id') ?? '') })
    else return { ok: false, intent }
    return { ok: true, intent }
  } catch {
    return { ok: false, intent }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <BoardNotificationsPage data={loaderData} />
}
