import { useTranslation } from 'react-i18next'

import { cn } from '~/shared/lib/cn'
import { formatVndInWords } from '~/shared/lib/currency/money-in-words'

export function MoneyInWords({
  amount,
  locale,
  className
}: {
  amount: number | null | undefined
  locale: string
  className?: string
}) {
  const { t } = useTranslation()
  const text = formatVndInWords(amount, locale)
  if (!text) return null
  return (
    <p className={cn('mt-1 break-words text-[11px] font-medium leading-5 text-muted-foreground', className)}>
      <span className='font-bold'>{t('money.amountInWords')}:</span> {text}
    </p>
  )
}
