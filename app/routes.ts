import { type RouteConfig, index, layout, prefix, route } from '@react-router/dev/routes'

export default [
  index('routes/home.tsx'),

  // Auth (login/register/change-password)
  route('login', 'routes/auth/login.tsx'),
  route('register', 'routes/auth/register.tsx'),
  route('change-password', 'routes/auth/change-password.tsx'),

  // ─── Dashboard route convention ───────────────────────────────────────────
  // Mọi dashboard URL đều theo pattern `/dashboard/<role>/<nav>` thống nhất:
  //   - `/dashboard/<role>`            → init page của role đó (mount tại index)
  //   - `/dashboard/<role>/<sub>`      → sub-page trong nav menu
  //
  // React Router 7: `layout(file, children)` là pathless layout (mount component
  // nhưng không claim URL). Để nhóm routes có cùng prefix path, dùng
  // `prefix(path, routes)` — chính là những gì ta cần cho `/dashboard/<role>/...`.
  // Lợi ích: không trùng URL giữa 2 role (vd Studio của Mangaka vs Assistant),
  // dễ đọc, dễ guard theo role, dễ deep-link từ notification.
  // Active state trong sidebar dùng prefix match nên `/dashboard/mangaka/series/123`
  // vẫn highlight item "My Series" (href=`/dashboard/mangaka/series`).

  // Mangaka dashboard
  ...prefix('dashboard/mangaka', [
    layout('routes/mangaka/_layout.tsx', [
      index('routes/mangaka/index.tsx'),
      route('series', 'routes/mangaka/series.tsx'),
      route('series/propose', 'routes/mangaka/propose-series.tsx'),
      route('series/:id/edit', 'routes/mangaka/series-edit.tsx'),
      route('series/:id', 'routes/mangaka/series-detail.tsx'),
      route('contracts', 'routes/mangaka/contracts.tsx'),
      route('contracts/:id', 'routes/mangaka/contract-detail.tsx'),
      route('studio', 'routes/mangaka/my-studio.tsx'),
      route('assistants', 'routes/mangaka/assistant-directory.tsx'),
      route('profile', 'routes/mangaka/profile.tsx')
    ])
  ]),

  // Assistant dashboard
  ...prefix('dashboard/assistant', [
    layout('routes/assistant/_layout.tsx', [
      index('routes/assistant/index.tsx'),
      route('tasks', 'routes/assistant/tasks.tsx'),
      route('studio', 'routes/assistant/studio.tsx'),
      route('invites', 'routes/assistant/invites.tsx'),
      route('notifications', 'routes/assistant/notifications.tsx'),
      route('profile', 'routes/assistant/profile.tsx')
    ])
  ]),

  // Editor dashboard — sub-pages chưa được implement, chỉ mount _layout + index.
  // Khi thêm sub-page, thêm `route('<sub>', '...')` bên trong layout() dưới đây.
  ...prefix('dashboard/editor', [
    layout('routes/editor/_layout.tsx', [
      index('routes/editor/index.tsx'),
      route('proposals', 'routes/editor/proposals.tsx'),
      route('proposals/:id', 'routes/editor/proposal-detail.tsx'),
      route('board', 'routes/editor/board.tsx'),
      route('board/pitching', 'routes/editor/board-pitching.tsx'),
      route('board/sessions', 'routes/editor/board-sessions.tsx'),
      route('board/sessions/:id', 'routes/editor/board-session-detail.tsx'),
      route('board/decisions', 'routes/editor/board-decisions.tsx'),
      route('board/reports', 'routes/editor/board-reports.tsx'),
      route('board/lifecycle', 'routes/editor/board-lifecycle.tsx'),
      route('contracts', 'routes/editor/contracts.tsx'),
      route('contracts/:id', 'routes/editor/contract-detail.tsx'),
      route('contracts/:id/terms', 'routes/editor/contract-terms.tsx'),
      route('contracts/:id/conditions', 'routes/editor/contract-conditions.tsx'),
      route('contracts/:id/history', 'routes/editor/contract-history.tsx'),
      route('contracts/:id/revenue', 'routes/editor/contract-revenue.tsx'),
      route('contracts/:id/amendments', 'routes/editor/contract-amendments.tsx'),
      route('operations', 'routes/editor/operations.tsx'),
      route('operations/lifecycle', 'routes/editor/operations-lifecycle.tsx'),
      route('operations/sales', 'routes/editor/operations-sales.tsx'),
      route('operations/reviews', 'routes/editor/operations-reviews.tsx'),
      route('operations/deadlines', 'routes/editor/operations-deadlines.tsx'),
      route('operations/surveys', 'routes/editor/operations-surveys.tsx'),
      route('operations/reprints', 'routes/editor/operations-reprints.tsx'),
      route('operations/transfers', 'routes/editor/operations-transfers.tsx'),
      route('operations/versions', 'routes/editor/operations-versions.tsx'),
      route('notifications', 'routes/editor/notifications.tsx'),
      route('profile', 'routes/editor/profile.tsx'),
      route('publication', 'routes/editor/publication.tsx'),
      route('publication/:seriesId/:chapterId', 'routes/editor/chapter-review.tsx')
    ])
  ]),

  // Board dashboard
  ...prefix('dashboard/board', [
    layout('routes/board/_layout.tsx', [
      index('routes/board/index.tsx'),
      route('sessions', 'routes/board/sessions.tsx'),
      route('sessions/:id', 'routes/board/session-detail.tsx'),
      route('decisions', 'routes/board/decisions.tsx'),
      route('decisions/:id', 'routes/board/decision-detail.tsx'),
      route('reports', 'routes/board/reports.tsx'),
      route('contracts', 'routes/board/contracts.tsx'),
      route('contracts/:id', 'routes/board/contract-detail.tsx'),
      route('payments', 'routes/board/payments.tsx'),
      route('deadlines', 'routes/board/deadlines.tsx'),
      route('rankings', 'routes/board/rankings.tsx'),
      route('reprints', 'routes/board/reprints.tsx'),
      route('transfers', 'routes/board/transfers.tsx'),
      route('audit', 'routes/board/audit.tsx'),
      route('notifications', 'routes/board/notifications.tsx'),
      route('profile', 'routes/board/profile.tsx')
    ])
  ]),

  // Super Admin dashboard
  ...prefix('dashboard/admin', [
    layout('routes/admin/_layout.tsx', [
      index('routes/admin/index.tsx'),
      route('users', 'routes/admin/users.tsx'),
      route('users/:id', 'routes/admin/user-detail.tsx'),
      route('audit', 'routes/admin/audit.tsx'),
      route('settings', 'routes/admin/settings.tsx')
    ])
  ]),

  // Publication workbench — focused work area, intentionally outside the
  // dashboard layout (no sidebar). Renders its own header with theme +
  // language controls and a back link to the series detail page.
  route('publish/:seriesId/:chapterId', 'routes/publish/$seriesId/$chapterId.tsx')
] satisfies RouteConfig
