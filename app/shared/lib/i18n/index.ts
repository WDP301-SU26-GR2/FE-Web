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
    interpolation: { escapeValue: false },
    // Allow HMR to refresh bundles without losing supportedLngs/loadedNamespaces.
    partialBundledLanguages: true
  })
}

/**
 * Vite HMR — when `resources.ts` re-evaluates (because a `*.json` file under
 * `app/locales/` was edited), push each refreshed namespace back into the
 * already-initialised i18n instance via `addResourceBundle`. Without this,
 * any new i18n key would silently keep showing as the raw path until the
 * page is fully reloaded (since `i18n.init({ resources })` runs exactly once
 * in the lifetime of the bundle).
 *
 * Notes:
 *  - We only register the HMR hook in dev (Vite sets `import.meta.hot`).
 *  - `addResourceBundle(... overwrite=true)` lets us replace the snapshot
 *    wholesale — keys that were deleted upstream actually disappear.
 *  - We force `reloadResources` so subscribers re-render.
 */
if (import.meta.hot) {
  import.meta.hot.accept('./resources', (newModule) => {
    if (!newModule) return
    const fresh = newModule.resources
    for (const lang of Object.keys(fresh) as string[]) {
      const namespaces = fresh[lang as keyof typeof fresh] as Record<string, unknown>
      for (const ns of Object.keys(namespaces)) {
        i18n.addResourceBundle(lang, ns, namespaces[ns], true, true)
      }
    }
    // Bump the cache so consumers re-render immediately.
    void i18n.reloadResources(Object.keys(fresh) as string[])
  })
}

export default i18n
export { SUPPORTED_LANGUAGES, FALLBACK_LANGUAGE, NAMESPACES, DEFAULT_NAMESPACE } from './resources'
export type { Language, Namespace } from './resources'
