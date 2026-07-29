import {
  usersControllerCreateUser,
  usersControllerDeleteUser,
  usersControllerListUsers,
  usersControllerResetUserPassword,
  usersControllerRestoreUser,
  usersControllerUpdateUserStatus
} from '~/api/operations/users/users'
import type {
  AdminCreateUserBodyDtoRoleCode,
  AdminUpdateUserStatusBodyDtoStatus,
  UsersControllerListUsersParams,
  UsersControllerListUsersRoleCode,
  UsersControllerListUsersStatus
} from '~/api/model/users'
import { AdminUsersPage, type AdminUserActionIntent, type AdminUserActionResult } from '~/features/admin'
import {
  extractApiErrorCode,
  extractApiErrorMessage,
  extractApiSuccessMessage
} from '~/shared/lib/api/extract-api-error'

import type { Route } from './+types/users'

const ROLE_CODES = ['MANGAKA', 'ASSISTANT', 'EDITOR', 'BOARD_MEMBER', 'SUPER_ADMIN'] as const
const USER_STATUSES = ['INACTIVE', 'ACTIVE', 'BANNED', 'BLOCKED'] as const
const MUTABLE_STATUSES = ['ACTIVE', 'BANNED', 'BLOCKED'] as const

export function meta() {
  return [{ title: 'User Management - MangaStudio Pro' }]
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const searchParams = new URL(request.url).searchParams
  const page = Math.max(Number.parseInt(searchParams.get('page') ?? '1', 10) || 1, 1)
  const limit = 20
  const roleCode = readEnum(searchParams.get('roleCode'), ROLE_CODES)
  const status = readEnum(searchParams.get('status'), USER_STATUSES)
  const search = searchParams.get('search')?.trim() || undefined
  const includeDeleted = searchParams.get('includeDeleted') === 'true'
  const onlyDeleted = searchParams.get('onlyDeleted') === 'true'

  const params: UsersControllerListUsersParams = {
    limit,
    offset: (page - 1) * limit,
    includeDeleted: includeDeleted ? 'true' : 'false',
    onlyDeleted: onlyDeleted ? 'true' : 'false',
    roleCode: roleCode as UsersControllerListUsersRoleCode | undefined,
    status: status as UsersControllerListUsersStatus | undefined,
    search
  }

  try {
    const response = await usersControllerListUsers(params)
    const deletedUserIds = onlyDeleted
      ? response.data.items.map((user) => user.id)
      : includeDeleted
        ? await listDeletedUserIds({ roleCode, status, search })
        : []
    return { data: response.data, deletedUserIds, hasError: false }
  } catch {
    return { data: null, deletedUserIds: [], hasError: true }
  }
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<AdminUserActionResult> {
  const formData = await request.formData()
  const rawIntent = String(formData.get('intent') ?? 'unknown')
  const intent = isActionIntent(rawIntent) ? rawIntent : 'unknown'

  try {
    if (intent === 'create') {
      const roleCode = readEnum(String(formData.get('roleCode') ?? ''), ['EDITOR', 'BOARD_MEMBER'] as const)
      if (!roleCode) return failure(intent, 'validation')

      const response = await usersControllerCreateUser({
        email: requiredValue(formData, 'email'),
        name: requiredValue(formData, 'name'),
        phoneNumber: requiredValue(formData, 'phoneNumber'),
        roleCode: roleCode as AdminCreateUserBodyDtoRoleCode
      })
      if (response.status !== 201) return failure(intent, 'actionFailed')
      return {
        ok: true,
        intent,
        messageKey: 'created',
        message: extractApiSuccessMessage(response, 'Đã tạo tài khoản nội bộ thành công.'),
        temporaryPassword: response.data.temporaryPassword,
        email: response.data.email
      }
    }

    const userId = requiredValue(formData, 'userId')

    if (intent === 'status') {
      const status = readEnum(String(formData.get('status') ?? ''), MUTABLE_STATUSES)
      if (!status) return failure(intent, 'validation')
      const reason = String(formData.get('reason') ?? '').trim() || undefined
      const response = await usersControllerUpdateUserStatus(
        { id: userId },
        { status: status as AdminUpdateUserStatusBodyDtoStatus, reason }
      )
      return success(
        intent,
        'statusUpdated',
        extractApiSuccessMessage(
          response,
          status === 'ACTIVE'
            ? 'Đã kích hoạt lại tài khoản.'
            : status === 'BANNED'
              ? 'Đã cấm tài khoản.'
              : 'Đã khóa tài khoản.'
        )
      )
    }

    if (intent === 'delete') {
      const response = await usersControllerDeleteUser({ id: userId })
      return success(intent, 'deleted', extractApiSuccessMessage(response, 'Đã xóa mềm tài khoản.'))
    }

    if (intent === 'restore') {
      const response = await usersControllerRestoreUser({ id: userId })
      return success(intent, 'restored', extractApiSuccessMessage(response, 'Đã khôi phục tài khoản.'))
    }

    if (intent === 'resetPassword') {
      const response = await usersControllerResetUserPassword({ id: userId })
      if (response.status !== 201) return failure(intent, 'actionFailed')
      return {
        ok: true,
        intent,
        messageKey: 'passwordReset',
        message: extractApiSuccessMessage(response, 'Đã cấp lại mật khẩu tạm thời.'),
        temporaryPassword: response.data.temporaryPassword,
        email: String(formData.get('userEmail') ?? '') || undefined
      }
    }

    return failure('unknown', 'invalidAction')
  } catch (error) {
    return failure(
      intent,
      mapErrorKey(error),
      extractApiErrorMessage(error, 'Không thể hoàn tất thao tác với tài khoản. Vui lòng thử lại.')
    )
  }
}

export default function DashboardAdminUsersRoute({ loaderData }: Route.ComponentProps) {
  return (
    <AdminUsersPage data={loaderData.data} deletedUserIds={loaderData.deletedUserIds} hasError={loaderData.hasError} />
  )
}

async function listDeletedUserIds({
  roleCode,
  status,
  search
}: Pick<UsersControllerListUsersParams, 'roleCode' | 'status' | 'search'>): Promise<string[]> {
  const limit = 100
  const ids: string[] = []
  let offset = 0

  while (true) {
    const response = await usersControllerListUsers({
      roleCode,
      status,
      search,
      limit,
      offset,
      includeDeleted: 'false',
      onlyDeleted: 'true'
    })
    ids.push(...response.data.items.map((user) => user.id))
    offset += response.data.items.length

    if (offset >= response.data.total || response.data.items.length === 0) return ids
  }
}

function requiredValue(formData: FormData, key: string): string {
  const value = String(formData.get(key) ?? '').trim()
  if (!value) throw new Error(`Missing ${key}`)
  return value
}

function readEnum<const T extends readonly string[]>(value: string | null, allowed: T): T[number] | undefined {
  return value && allowed.includes(value as T[number]) ? (value as T[number]) : undefined
}

function isActionIntent(value: string): value is AdminUserActionIntent {
  return ['create', 'status', 'delete', 'restore', 'resetPassword'].includes(value)
}

function success(intent: AdminUserActionIntent, messageKey: string, message: string): AdminUserActionResult {
  return { ok: true, intent, messageKey, message }
}

function failure(intent: AdminUserActionIntent | 'unknown', errorKey: string, message?: string): AdminUserActionResult {
  return { ok: false, intent, errorKey, message }
}

function mapErrorKey(error: unknown): string {
  const code = extractApiErrorCode(error)
  if (code === 'Error.EmailAlreadyExists') return 'emailExists'
  if (code === 'Error.CannotModifyAdminUser') return 'cannotModifyAdmin'
  if (code === 'Error.UserAlreadyDeleted') return 'alreadyDeleted'
  if (code === 'Error.UserNotDeleted') return 'notDeleted'
  if (code === 'Error.UserNotFound') return 'notFound'
  if (code === 'Error.UserHasActiveCommitments') return 'activeCommitments'
  return 'actionFailed'
}
