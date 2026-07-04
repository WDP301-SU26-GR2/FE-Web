import { RegisterPage } from '~/features/auth'
import type { Route } from './+types/register'

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Đăng ký tài khoản - MangaStudio Pro' },
    { name: 'description', content: 'Tạo tài khoản MangaStudio Pro cho tác giả hoặc trợ lý' }
  ]
}

export default function RegisterRoute() {
  return <RegisterPage />
}
