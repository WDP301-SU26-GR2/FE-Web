import { paymentControllerGetPaymentById } from '~/api/operations/payments/payments'
import { MangakaPaymentDetailPage, mangakaRouteMeta } from '~/features/mangaka'

export function meta() {
  return mangakaRouteMeta('routeMeta.paymentDetail.title', 'routeMeta.paymentDetail.description')
}

export async function clientLoader({ params }: { params: { id: string } }) {
  try {
    const response = await paymentControllerGetPaymentById({ id: params.id })
    return { payment: response.status === 200 ? response.data : null, loadFailed: response.status !== 200 }
  } catch {
    return { payment: null, loadFailed: true }
  }
}

export default function MangakaPaymentDetailRoute({
  loaderData
}: {
  loaderData: Awaited<ReturnType<typeof clientLoader>>
}) {
  return <MangakaPaymentDetailPage {...loaderData} />
}
