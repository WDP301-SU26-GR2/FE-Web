import { Download, FileKey2, LoaderCircle, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useTaskSignedUrl } from '~/shared/hooks/use-task-signed-url'

export type ProtectedTaskFileLabels = {
  title: string
  description: string
  taskId: string
  fileKey: string
  createLink: string
  openDownload: string
  loading: string
  expiresAt: string
}

export function ProtectedTaskFilePanel({
  labels,
  inputClassName
}: {
  labels: ProtectedTaskFileLabels
  inputClassName: string
}) {
  const [taskIdInput, setTaskIdInput] = useState('')
  const [fileKeyInput, setFileKeyInput] = useState('')
  const [lookup, setLookup] = useState<{ taskId: string; fileKey: string } | null>(null)
  const signed = useTaskSignedUrl(lookup?.taskId, lookup?.fileKey)

  return (
    <section className='overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-sm'>
      <div className='flex items-start gap-3 border-b border-primary/15 bg-primary/5 p-5'>
        <span className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground'>
          <ShieldCheck className='size-5' aria-hidden='true' />
        </span>
        <div>
          <h2 className='text-sm font-bold text-foreground'>{labels.title}</h2>
          <p className='mt-1 text-xs leading-5 text-muted-foreground'>{labels.description}</p>
        </div>
      </div>

      <form
        className='grid gap-3 p-5 sm:grid-cols-2'
        onSubmit={(event) => {
          event.preventDefault()
          setLookup({ taskId: taskIdInput.trim(), fileKey: fileKeyInput.trim() })
        }}
      >
        <label className='text-xs font-bold text-foreground'>
          {labels.taskId}
          <input
            className={`${inputClassName} mt-2`}
            value={taskIdInput}
            onChange={(event) => setTaskIdInput(event.target.value)}
            required
            autoComplete='off'
          />
        </label>
        <label className='text-xs font-bold text-foreground'>
          {labels.fileKey}
          <input
            className={`${inputClassName} mt-2`}
            value={fileKeyInput}
            onChange={(event) => setFileKeyInput(event.target.value)}
            required
            autoComplete='off'
          />
        </label>
        <button
          className='inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-60 sm:col-span-2'
          disabled={!taskIdInput.trim() || !fileKeyInput.trim() || signed.status === 'loading'}
        >
          {signed.status === 'loading' ? (
            <LoaderCircle className='size-4 animate-spin' aria-hidden='true' />
          ) : (
            <FileKey2 className='size-4' aria-hidden='true' />
          )}
          {signed.status === 'loading' ? labels.loading : labels.createLink}
        </button>
      </form>

      {signed.status === 'error' && <p className='mx-5 mb-5 text-xs text-destructive'>{signed.message}</p>}
      {signed.status === 'ready' && (
        <div className='mx-5 mb-5 flex flex-col justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center'>
          <p className='text-xs text-muted-foreground'>
            {labels.expiresAt}: {new Date(signed.expiresAt).toLocaleString()}
          </p>
          <a
            href={signed.url}
            target='_blank'
            rel='noreferrer'
            className='inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-xs font-bold text-primary-foreground'
          >
            <Download className='size-4' aria-hidden='true' />
            {labels.openDownload}
          </a>
        </div>
      )}
    </section>
  )
}
