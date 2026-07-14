import { AssistantDirectoryPage } from '~/features/mangaka'
import type { Route } from './+types/assistant-directory'

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Assistant Directory - MangakaStudio Pro' },
    { name: 'description', content: 'Tìm và mời trợ lý cộng tác cho series của bạn' }
  ]
}

export default function DashboardAssistantDirectoryRoute() {
  return <AssistantDirectoryPage />
}