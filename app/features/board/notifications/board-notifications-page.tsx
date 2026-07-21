import type { NotificationListResDtoOutput } from '~/api/model/notifications'
import { RoleNotificationsPage } from '~/shared/components/role-notifications-page'

export function BoardNotificationsPage({
  data,
  linkRole = 'BOARD_MEMBER'
}: {
  data: NotificationListResDtoOutput
  linkRole?: 'BOARD_MEMBER' | 'SUPER_ADMIN'
}) {
  return (
    <RoleNotificationsPage
      data={data}
      role={linkRole}
      backHref={linkRole === 'SUPER_ADMIN' ? '/dashboard/admin' : '/dashboard/board'}
    />
  )
}
