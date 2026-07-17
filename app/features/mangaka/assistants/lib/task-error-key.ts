// Map backend error codes to i18n keys (namespace = mangaka)

const TASK_ERROR_MAP: Record<string, { key: string; fallback: string }> = {
  'Error.AssistantNotHired': {
    key: 'studio.tasks.errors.assistantNotHired',
    fallback: 'Trợ lý này không còn quan hệ cộng tác đang hiệu lực.'
  },
  'Error.ChapterOnHold': {
    key: 'studio.tasks.errors.chapterOnHold',
    fallback: 'Chương đang tạm dừng. Hãy tiếp tục chương trước khi giao việc.'
  },
  'Error.NotSeriesOwner': {
    key: 'studio.tasks.errors.notSeriesOwner',
    fallback: 'Bạn không có quyền giao việc trên trang này.'
  },
  'Error.PageNotFound': {
    key: 'studio.tasks.errors.pageNotFound',
    fallback: 'Không tìm thấy trang hoặc trang đã bị xoá.'
  },
  'Error.AssetNotFound': {
    key: 'studio.tasks.errors.assetNotFound',
    fallback: 'Một tài liệu tham khảo không còn tồn tại. Hãy tải lại file.'
  },
  'Error.InvalidTaskTransition': {
    key: 'studio.tasks.errors.invalidTransition',
    fallback: 'Task đã đổi trạng thái. Hãy tải lại trước khi thao tác.'
  },
  'Error.TaskNotReassignable': {
    key: 'studio.tasks.errors.notReassignable',
    fallback: 'Task ở trạng thái hiện tại không thể giao lại.'
  },
  'Error.TaskNotCancellable': {
    key: 'studio.tasks.errors.notCancellable',
    fallback: 'Task đã hoàn tất hoặc đã huỷ nên không thể huỷ lại.'
  },
  'Error.TaskNotFound': {
    key: 'studio.tasks.errors.notFound',
    fallback: 'Không tìm thấy task.'
  }
}

export function getTaskErrorMessage(code: string, fallback: string): string {
  const mapped = TASK_ERROR_MAP[code]
  if (!mapped) return fallback
  return mapped.fallback
}

export function getTaskErrorKey(code: string): string {
  return TASK_ERROR_MAP[code]?.key ?? 'studio.tasks.errors.generic'
}
