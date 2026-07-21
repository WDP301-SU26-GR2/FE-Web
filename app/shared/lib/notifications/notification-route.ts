import {
  notificationControllerList,
  notificationControllerMarkAllRead,
  notificationControllerMarkRead
} from '~/api/operations/notifications/notifications'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

const PAGE_SIZE = 12

export async function loadNotifications(request: Request) {
  const params = new URL(request.url).searchParams
  const page = positiveInteger(params.get('page'))
  const filter = params.get('filter')
  const isRead = filter === 'unread' ? 'false' : filter === 'read' ? 'true' : undefined
  const response = await notificationControllerList({
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    isRead
  })
  return response.data
}

export async function handleNotificationAction(request: Request) {
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')

  try {
    if (intent === 'markAllRead') await notificationControllerMarkAllRead()
    else if (intent === 'markRead') {
      const id = String(form.get('id') ?? '')
      if (!id) return { ok: false, intent, message: 'Thiếu mã thông báo.' }
      await notificationControllerMarkRead({ id })
    } else return { ok: false, intent, message: 'Thao tác không hợp lệ.' }

    return { ok: true, intent }
  } catch (error) {
    return {
      ok: false,
      intent,
      message: extractApiErrorMessage(error, 'Không thể cập nhật thông báo. Vui lòng thử lại.')
    }
  }
}

function positiveInteger(value: string | null) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}
