import i18n from '~/shared/lib/i18n'
import { SITE } from '~/shared/config/site'

export function mangakaRouteMeta(titleKey: string, descriptionKey?: string) {
  const t = i18n.getFixedT(null, 'mangaka')
  const result: Array<{ title?: string; name?: string; content?: string }> = [
    { title: `${t(titleKey)} | ${SITE.name}` }
  ]
  if (descriptionKey) result.push({ name: 'description', content: t(descriptionKey) })
  return result
}
