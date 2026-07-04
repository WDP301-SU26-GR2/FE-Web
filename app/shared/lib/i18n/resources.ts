import enCommon from '~/locales/en/common.json'
import enWelcome from '~/locales/en/welcome.json'
import enAuth from '~/locales/en/auth.json'
import enMangaka from '~/locales/en/mangaka.json'
import viCommon from '~/locales/vi/common.json'
import viWelcome from '~/locales/vi/welcome.json'
import viAuth from '~/locales/vi/auth.json'
import viMangaka from '~/locales/vi/mangaka.json'

/**
 * Tập hợp tài nguyên i18n. Mỗi feature 1 namespace riêng để:
 * - Tránh đè key giữa các feature.
 * - Sau này dễ chuyển sang lazy-load (mỗi namespace 1 file riêng).
 *
 * Khi thêm namespace mới:
 *   1. Tạo locales/{en,vi}/<feature>.json
 *   2. Import + thêm vào object dưới
 *   3. Thêm tên namespace vào NAMESPACES
 */

export const NAMESPACES = ['common', 'welcome', 'auth', 'mangaka'] as const
export type Namespace = (typeof NAMESPACES)[number]

export const DEFAULT_NAMESPACE: Namespace = 'common'

export const resources = {
  en: {
    common: enCommon,
    welcome: enWelcome,
    auth: enAuth,
    mangaka: enMangaka
  },
  vi: {
    common: viCommon,
    welcome: viWelcome,
    auth: viAuth,
    mangaka: viMangaka
  }
} as const

export const SUPPORTED_LANGUAGES = ['en', 'vi'] as const
export type Language = (typeof SUPPORTED_LANGUAGES)[number]

export const FALLBACK_LANGUAGE: Language = 'vi'
