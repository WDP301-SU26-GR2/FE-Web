import { useTranslation } from 'react-i18next'
import { AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline } from 'lucide-react'
import type { ProposalFormData } from '../create-proposal-wizard'

interface Props {
  form: ProposalFormData
  onChange: <K extends keyof ProposalFormData>(key: K, value: ProposalFormData[K]) => void
}

const FORMAT_TOOLBAR: ReadonlyArray<{
  icon: typeof Bold
  labelKey: 'bold' | 'italic' | 'underline' | 'alignLeft' | 'alignCenter' | 'alignRight'
} | null> = [
  { icon: Bold, labelKey: 'bold' },
  { icon: Italic, labelKey: 'italic' },
  { icon: Underline, labelKey: 'underline' },
  null, // divider
  { icon: AlignLeft, labelKey: 'alignLeft' },
  { icon: AlignCenter, labelKey: 'alignCenter' },
  { icon: AlignRight, labelKey: 'alignRight' }
]

const SYNOPSIS_MAX = 5000

export function StorySummaryStep({ form, onChange }: Props) {
  const { t } = useTranslation('mangaka')

  // `synopsis` is the API field `CreateProposalBodyDto.synopsis` (max 5000).
  const wordCount = form.synopsis.trim().split(/\s+/).filter(Boolean).length
  const charCount = form.synopsis.length
  const overLimit = charCount > SYNOPSIS_MAX

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-lg font-bold'>{t('wizard.step2')}</h2>
        <p className='mt-1 text-sm text-muted-foreground'>{t('wizard.step2Desc')}</p>
      </div>

      {/* Word-like editor bound to `synopsis` */}
      <div className='space-y-0 rounded-xl border border-border overflow-hidden'>
        {/* Toolbar */}
        <div className='flex items-center gap-1 border-b border-border bg-muted/40 px-3 py-2'>
          {FORMAT_TOOLBAR.map((item, index) =>
            item === null ? (
              <div key={`div-${index}`} className='mx-1 h-5 w-px bg-border' />
            ) : (
              <button
                key={item.labelKey}
                title={t(`wizard.toolbar.${item.labelKey}`)}
                className='flex h-8 w-8 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer'
              >
                <item.icon className='h-4 w-4' />
              </button>
            )
          )}
        </div>

        {/* Text Area — bound to `form.synopsis` */}
        <textarea
          value={form.synopsis}
          onChange={(e) => onChange('synopsis', e.target.value)}
          placeholder={t('wizard.synopsisPlaceholder')}
          rows={14}
          maxLength={SYNOPSIS_MAX}
          className='w-full resize-none border-0 bg-background px-5 py-4 text-sm leading-relaxed placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0'
        />

        {/* Word / Char count */}
        <div className='flex items-center justify-end gap-4 border-t border-border bg-muted/30 px-4 py-2'>
          <span className='text-xs text-muted-foreground'>{t('wizard.wordCount', { count: wordCount })}</span>
          <span className={`text-xs ${overLimit ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
            {t('wizard.charCount', { count: charCount })}
          </span>
        </div>
      </div>
    </div>
  )
}
