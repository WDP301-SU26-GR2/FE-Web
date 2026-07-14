import { type RouteConfig, index, layout, route } from '@react-router/dev/routes'

export default [
  index('routes/home.tsx'),

  // Auth (login/register/change-password)
  route('login', 'routes/auth/login.tsx'),
  route('register', 'routes/auth/register.tsx'),
  route('change-password', 'routes/auth/change-password.tsx'),

  // Mangaka dashboard - layout bọc DashboardLayout mount 1 lần cho cả nhóm
  // (index, series list, propose, series detail/edit). Nav menu + sidebar
  // KHONG remount khi chuyển sub-route, chỉ <Outlet /> swap body.
  layout('routes/mangaka/_layout.tsx', [
    route('dashboard/mangaka', 'routes/mangaka/index.tsx'),
    route('dashboard/series', 'routes/mangaka/series.tsx'),
    route('dashboard/series/propose', 'routes/mangaka/propose-series.tsx'),
    route('dashboard/series/:id/edit', 'routes/mangaka/series-edit.tsx'),
    route('dashboard/series/:id', 'routes/mangaka/series-detail.tsx')
  ]),

  // Other roles - mỗi role 1 folder riêng, layout wrap 1 route index
  route('dashboard/assistant', 'routes/assistant/_layout.tsx', [
    index('routes/assistant/index.tsx')
  ]),
  route('dashboard/editor', 'routes/editor/_layout.tsx', [
    index('routes/editor/index.tsx')
  ]),
  route('dashboard/board', 'routes/board/_layout.tsx', [
    index('routes/board/index.tsx')
  ]),
  route('dashboard/admin', 'routes/admin/_layout.tsx', [
    index('routes/admin/index.tsx')
  ])
] satisfies RouteConfig
