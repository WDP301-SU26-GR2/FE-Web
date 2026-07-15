import type { AdminUserListResDtoOutputItemsItem } from '~/api/model/users'

export type AdminUserAction = 'status' | 'delete' | 'restore' | 'resetPassword'

export interface SelectedUserAction {
  action: AdminUserAction
  user: AdminUserListResDtoOutputItemsItem
}

export type AdminUserActionIntent = 'create' | AdminUserAction

export type AdminUserActionResult =
  | {
      ok: true
      intent: AdminUserActionIntent
      messageKey: string
      temporaryPassword?: string
      email?: string
    }
  | {
      ok: false
      intent: AdminUserActionIntent | 'unknown'
      errorKey: string
    }
