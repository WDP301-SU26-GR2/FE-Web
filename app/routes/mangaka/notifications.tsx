import { RoleNotificationsPage } from '~/shared/components/role-notifications-page'
import { handleNotificationAction, loadNotifications } from '~/shared/lib/notifications/notification-route'
import type { Route } from './+types/notifications'

export function meta() {
  return [{ title: 'Thông báo tác giả - Mangaka Studio' }]
}

export const clientLoader = ({ request }: Route.ClientLoaderArgs) => loadNotifications(request)

export const clientAction = ({ request }: Route.ClientActionArgs) => handleNotificationAction(request)

export default function MangakaNotificationsRoute({ loaderData }: Route.ComponentProps) {
  return <RoleNotificationsPage data={loaderData} role='MANGAKA' backHref='/dashboard/mangaka' />
}
