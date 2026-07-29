import { AssistantDirectoryPage, mangakaRouteMeta } from '~/features/mangaka'
import type { Route } from './+types/assistant-directory'

export function meta({}: Route.MetaArgs) {
  return mangakaRouteMeta('routeMeta.assistantDirectory.title', 'routeMeta.assistantDirectory.description')
}

export default function DashboardAssistantDirectoryRoute() {
  return <AssistantDirectoryPage />
}
