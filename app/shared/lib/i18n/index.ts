import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import { DEFAULT_NAMESPACE, FALLBACK_LANGUAGE, NAMESPACES, resources, SUPPORTED_LANGUAGES } from './resources'

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: FALLBACK_LANGUAGE,
    fallbackLng: FALLBACK_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    ns: NAMESPACES,
    defaultNS: DEFAULT_NAMESPACE,
    interpolation: { escapeValue: false }
  })
}

export default i18n
export { SUPPORTED_LANGUAGES, FALLBACK_LANGUAGE, NAMESPACES, DEFAULT_NAMESPACE } from './resources'
export type { Language, Namespace } from './resources'
