import { BoardNotificationsPage } from '~/features/board'
import { handleNotificationAction, loadNotifications } from '~/shared/lib/notifications/notification-route'
import type { Route } from './+types/notifications'

export const clientLoader = ({ request }: Route.ClientLoaderArgs) => loadNotifications(request)

export const clientAction = ({ request }: Route.ClientActionArgs) => handleNotificationAction(request)

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <BoardNotificationsPage data={loaderData} />
}
