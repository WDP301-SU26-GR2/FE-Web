import { BoardNotificationsPage } from '~/features/board'
import {
  clientAction as boardNotificationsAction,
  clientLoader as boardNotificationsLoader
} from '../board/notifications'
import type { Route } from './+types/notifications'

export const clientLoader = boardNotificationsLoader
export const clientAction = boardNotificationsAction

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <BoardNotificationsPage data={loaderData} linkRole='SUPER_ADMIN' />
}
