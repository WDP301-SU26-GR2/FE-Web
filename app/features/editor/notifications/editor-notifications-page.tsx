import type { NotificationListResDtoOutput } from '~/api/model/notifications'
import { RoleNotificationsPage } from '~/shared/components/role-notifications-page'

export function EditorNotificationsPage({ data }: { data: NotificationListResDtoOutput }) {
  return <RoleNotificationsPage data={data} role='EDITOR' backHref='/dashboard/editor' />
}
