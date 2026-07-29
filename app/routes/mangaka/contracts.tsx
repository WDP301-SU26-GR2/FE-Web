import { contractControllerGetContracts } from '~/api/operations/contracts/contracts'
import { MangakaContractsPage } from '~/features/mangaka'
import i18n from '~/shared/lib/i18n'

const tMangaka = i18n.getFixedT(null, 'mangaka')

export function meta() {
  return [{ title: tMangaka('contracts.meta.listTitle') }]
}

export async function clientLoader() {
  const response = await contractControllerGetContracts()
  if (response.status !== 200) throw new Response(tMangaka('contracts.errors.loadList'), { status: response.status })
  return { contracts: response.data }
}

export default function MangakaContractsRoute({
  loaderData
}: {
  loaderData: Awaited<ReturnType<typeof clientLoader>>
}) {
  return <MangakaContractsPage contracts={loaderData.contracts} />
}
