import { ArrowLeft, MessageSquareText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { contractControllerListComments } from '~/api/operations/contracts/contracts'

import type { Route } from './+types/contract-comments'

export function meta({ data }: Route.MetaArgs) {
  const title = data?.contractId ? `Comments - ${data.contractId}` : 'Contract Comments'
  return [{ title: `${title} - MangaStudio Pro` }]
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const contractId = params.id
  if (!contractId) return { comments: null, contractId: null, hasError: true }

  try {
    const response = await contractControllerListComments({ id: contractId })
    return { comments: response.data.data ?? [], contractId, hasError: false }
  } catch {
    return { comments: null, contractId, hasError: true }
  }
}

export default function AdminContractCommentsRoute({ loaderData }: Route.ComponentProps) {
  const { t, i18n } = useTranslation('admin')
  const { comments, contractId, hasError } = loaderData

  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(iso))

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <Link
        to="/dashboard/admin/contracts"
        className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t('contracts.comments.back', 'Quay lại danh sách hợp đồng')}
      </Link>

      <header>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
          {t('contracts.eyebrow')}
        </p>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-foreground">
          {t('contracts.comments.title')}
        </h1>
        {contractId && (
          <p className="mt-1 text-xs text-muted-foreground">
            Hợp đồng: <code className="rounded bg-muted px-1.5 py-0.5">{contractId}</code>
          </p>
        )}
      </header>

      {hasError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
          <p className="text-sm font-bold text-destructive">{t('contracts.comments.loadError')}</p>
        </div>
      ) : !comments || comments.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <MessageSquareText className="mx-auto size-8 text-muted-foreground/40" aria-hidden="true" />
          <p className="mt-3 text-sm text-muted-foreground">{t('contracts.comments.empty')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => {
            const authorName = comment.author?.displayName ?? t('common.notAvailable')
            return (
              <div key={comment.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary uppercase">
                      {authorName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{authorName}</p>
                      <time className="text-[10px] text-muted-foreground" dateTime={comment.createdAt}>
                        {fmtDate(comment.createdAt)}
                      </time>
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-foreground">{comment.content}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
