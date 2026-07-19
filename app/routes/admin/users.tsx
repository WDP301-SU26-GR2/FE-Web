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
import { extractApiErrorCode } from '~/shared/lib/api/extract-api-error'

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

  const params: UsersControllerListUsersParams = {
    limit,
    offset: (page - 1) * limit,
    includeDeleted: searchParams.get('includeDeleted') === 'true' ? 'true' : 'false',
    roleCode: roleCode as UsersControllerListUsersRoleCode | undefined,
    status: status as UsersControllerListUsersStatus | undefined,
    search
  }

  try {
    const response = await usersControllerListUsers(params)
    return { data: response.data, hasError: false }
  } catch {
    return { data: null, hasError: true }
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
        temporaryPassword: response.data.temporaryPassword,
        email: response.data.email
      }
    }

    const userId = requiredValue(formData, 'userId')

    if (intent === 'status') {
      const status = readEnum(String(formData.get('status') ?? ''), MUTABLE_STATUSES)
      if (!status) return failure(intent, 'validation')
      const reason = String(formData.get('reason') ?? '').trim() || undefined
      await usersControllerUpdateUserStatus(
        { id: userId },
        { status: status as AdminUpdateUserStatusBodyDtoStatus, reason }
      )
      return success(intent, 'statusUpdated')
    }

    if (intent === 'delete') {
      await usersControllerDeleteUser({ id: userId })
      return success(intent, 'deleted')
    }

    if (intent === 'restore') {
      await usersControllerRestoreUser({ id: userId })
      return success(intent, 'restored')
    }

    if (intent === 'resetPassword') {
      const response = await usersControllerResetUserPassword({ id: userId })
      if (response.status !== 201) return failure(intent, 'actionFailed')
      return {
        ok: true,
        intent,
        messageKey: 'passwordReset',
        temporaryPassword: response.data.temporaryPassword,
        email: String(formData.get('userEmail') ?? '') || undefined
      }
    }

    return failure('unknown', 'invalidAction')
  } catch (error) {
    return failure(intent, mapErrorKey(error))
  }
}

export default function DashboardAdminUsersRoute({ loaderData }: Route.ComponentProps) {
  return <AdminUsersPage data={loaderData.data} hasError={loaderData.hasError} />
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

function success(intent: AdminUserActionIntent, messageKey: string): AdminUserActionResult {
  return { ok: true, intent, messageKey }
}

function failure(intent: AdminUserActionIntent | 'unknown', errorKey: string): AdminUserActionResult {
  return { ok: false, intent, errorKey }
}

function mapErrorKey(error: unknown): string {
  const code = extractApiErrorCode(error)
  if (code === 'Error.EmailAlreadyExists') return 'emailExists'
  if (code === 'Error.CannotModifyAdminUser') return 'cannotModifyAdmin'
  if (code === 'Error.UserAlreadyDeleted') return 'alreadyDeleted'
  if (code === 'Error.UserNotDeleted') return 'notDeleted'
  if (code === 'Error.UserNotFound') return 'notFound'
  return 'actionFailed'
}
