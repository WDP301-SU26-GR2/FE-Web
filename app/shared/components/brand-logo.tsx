import { SITE } from '~/shared/config/site'
import { cn } from '~/shared/lib/cn'

interface BrandLogoProps {
  className?: string
  alt?: string
}

export function BrandLogo({ className, alt = SITE.name }: BrandLogoProps) {
  return <img src={SITE.logoUrl} alt={alt} className={cn('object-cover', className)} />
}
