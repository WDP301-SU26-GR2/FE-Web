import { AssistantDashboard } from '~/features/assistant'
import type { Route } from './+types/index'

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Assistant Dashboard - MangakaStudio Pro' },
    { name: 'description', content: 'Bảng điều khiển dành cho trợ lý' }
  ]
}

export default function DashboardAssistantRoute() {
  return <AssistantDashboard />
}
