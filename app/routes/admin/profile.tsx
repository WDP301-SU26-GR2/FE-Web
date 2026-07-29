import { AccountProfilePage } from '~/features/profile'

export function meta() {
  return [{ title: 'Admin Profile - MangaStudio Pro' }]
}

export default function AdminProfileRoute() {
  return <AccountProfilePage />
}
