import { type RouteConfig, index, layout, route } from '@react-router/dev/routes'

export default [
  index('routes/home.tsx'),

  // Auth (login/register/change-password)
  route('login', 'routes/auth/login.tsx'),
  route('register', 'routes/auth/register.tsx'),
  route('change-password', 'routes/auth/change-password.tsx'),

  // Mangaka dashboard - layout bọc DashboardLayout mount 1 lần cho cả nhóm
  // (index, series list, propose, series detail/edit, studio). Nav menu + sidebar
  // KHONG remount khi chuyển sub-route, chỉ <Outlet /> swap body.
  layout('routes/mangaka/_layout.tsx', [
    route('dashboard/mangaka', 'routes/mangaka/index.tsx'),
    route('dashboard/series', 'routes/mangaka/series.tsx'),
    route('dashboard/series/propose', 'routes/mangaka/propose-series.tsx'),
    route('dashboard/series/:id/edit', 'routes/mangaka/series-edit.tsx'),
    route('dashboard/series/:id', 'routes/mangaka/series-detail.tsx'),
    route('dashboard/studio', 'routes/mangaka/my-studio.tsx'),
    route('dashboard/assistants', 'routes/mangaka/assistant-directory.tsx'),
    route('dashboard/mangaka/profile', 'routes/mangaka/profile.tsx')
  ]),

  // Assistant dashboard - layout bọc DashboardLayout mount 1 lần cho cả nhóm.
  // Sub-route URL KHONG prefix `/dashboard/assistant/`, mà dùng `/dashboard/<x>` —
  // giống pattern của Mangaka (sub-route mount ở `/dashboard/series`, `/dashboard/studio`...).
  // Active state của nav dùng prefix match (xem isItemActive), nên:
  //   - pathname '/dashboard/tasks' → chỉ 'My Tasks' active
  //   - pathname '/dashboard/assistant' → chỉ 'Home' active (vì href khác prefix)
  layout('routes/assistant/_layout.tsx', [
    route('dashboard/assistant', 'routes/assistant/index.tsx'),
    route('dashboard/tasks', 'routes/assistant/tasks.tsx'),
    route('dashboard/studio', 'routes/assistant/studio.tsx'),
    route('dashboard/invites', 'routes/assistant/invites.tsx'),
    route('dashboard/notifications', 'routes/assistant/notifications.tsx'),
    route('dashboard/profile', 'routes/assistant/profile.tsx')
  ]),
  route('dashboard/editor', 'routes/editor/_layout.tsx', [index('routes/editor/index.tsx')]),
  route('dashboard/board', 'routes/board/_layout.tsx', [index('routes/board/index.tsx')]),
  route('dashboard/admin', 'routes/admin/_layout.tsx', [index('routes/admin/index.tsx')])
] satisfies RouteConfig
