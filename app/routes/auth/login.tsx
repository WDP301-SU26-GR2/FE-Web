import { LoginPage } from '~/features/auth'
import type { Route } from './+types/login'

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Đăng nhập - MangaStudio Pro' },
    { name: 'description', content: 'Đăng nhập vào không gian làm việc MangaStudio Pro' }
  ]
}

export default function LoginRoute() {
  return <LoginPage />
}
