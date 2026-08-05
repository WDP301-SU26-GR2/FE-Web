import { EditorNotificationsPage } from '~/features/editor'
import { handleNotificationAction, loadNotifications } from '~/shared/lib/notifications/notification-route'
import type { Route } from './+types/notifications'
import { SITE } from '~/shared/config/site'

export function meta() {
  return [{ title: SITE.name }]
}

export const clientLoader = ({ request }: Route.ClientLoaderArgs) => loadNotifications(request)

export const clientAction = ({ request }: Route.ClientActionArgs) => handleNotificationAction(request)

export default function EditorNotificationsRoute({ loaderData }: Route.ComponentProps) {
  return <EditorNotificationsPage data={loaderData} />
}
