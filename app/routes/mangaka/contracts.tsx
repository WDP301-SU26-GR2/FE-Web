import { contractControllerGetContracts } from '~/api/operations/contracts/contracts'
import { MangakaContractsPage } from '~/features/mangaka'

export function meta() {
  return [{ title: 'Hợp đồng - MangakaStudio Pro' }]
}

export async function clientLoader() {
  const response = await contractControllerGetContracts()
  if (response.status !== 200) throw new Response('Không thể tải hợp đồng', { status: response.status })
  return { contracts: response.data }
}

export default function MangakaContractsRoute({
  loaderData
}: {
  loaderData: Awaited<ReturnType<typeof clientLoader>>
}) {
  return <MangakaContractsPage contracts={loaderData.contracts} />
}
