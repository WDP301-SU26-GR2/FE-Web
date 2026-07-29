import { contractControllerGetContractVersionById } from '~/api/operations/contracts/contracts'
import { isFetchError } from '~/api/mutator/custom-fetch'
import { MangakaContractVersionDetailPage, mangakaRouteMeta } from '~/features/mangaka'

export function meta() {
  return mangakaRouteMeta('routeMeta.contractVersion.title', 'routeMeta.contractVersion.description')
}

export async function clientLoader({ params }: { params: { id: string; versionId: string } }) {
  try {
    const response = await contractControllerGetContractVersionById({ id: params.id, versionId: params.versionId })
    return {
      contractId: params.id,
      version: response.status === 200 ? response.data : null,
      loadFailed: response.status !== 200
    }
  } catch (error) {
    if (isFetchError(error) && error.status >= 400 && error.status <= 599) {
      throw new Response('Unable to load contract version.', { status: error.status })
    }
    return { contractId: params.id, version: null, loadFailed: true }
  }
}

export default function MangakaContractVersionDetailRoute({
  loaderData
}: {
  loaderData: Awaited<ReturnType<typeof clientLoader>>
}) {
  return <MangakaContractVersionDetailPage {...loaderData} />
}
