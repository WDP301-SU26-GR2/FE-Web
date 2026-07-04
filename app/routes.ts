import { type RouteConfig, index, route } from '@react-router/dev/routes'

export default [
  index('routes/home.tsx'),
  route('login', 'routes/login.tsx'),
  route('register', 'routes/register.tsx'),
  route('change-password', 'routes/change-password.tsx'),
  route('dashboard/mangaka', 'routes/dashboard-mangaka.tsx'),
  route('dashboard/series', 'routes/dashboard-series.tsx'),
  route('dashboard/series/propose', 'routes/dashboard-propose-series.tsx'),
  route('dashboard/assistant', 'routes/dashboard-assistant.tsx'),
  route('dashboard/editor', 'routes/dashboard-editor.tsx'),
  route('dashboard/board', 'routes/dashboard-board.tsx'),
  route('dashboard/admin', 'routes/dashboard-admin.tsx')
] satisfies RouteConfig
