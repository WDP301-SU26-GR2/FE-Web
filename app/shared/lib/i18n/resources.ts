import enCommon from '~/locales/en/common.json'
import enWelcome from '~/locales/en/welcome.json'
import enAuth from '~/locales/en/auth.json'
import enMangaka from '~/locales/en/mangaka.json'
import enProfile from '~/locales/en/profile.json'
import enAssistant from '~/locales/en/assistant.json'
import enAdmin from '~/locales/en/admin.json'
import enEditor from '~/locales/en/editor.json'
import enBoard from '~/locales/en/board.json'
import viCommon from '~/locales/vi/common.json'
import viWelcome from '~/locales/vi/welcome.json'
import viAuth from '~/locales/vi/auth.json'
import viMangaka from '~/locales/vi/mangaka.json'
import viProfile from '~/locales/vi/profile.json'
import viAssistant from '~/locales/vi/assistant.json'
import viAdmin from '~/locales/vi/admin.json'
import viEditor from '~/locales/vi/editor.json'
import viBoard from '~/locales/vi/board.json'

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

export const NAMESPACES = [
  'common',
  'welcome',
  'auth',
  'mangaka',
  'profile',
  'assistant',
  'admin',
  'editor',
  'board'
] as const
export type Namespace = (typeof NAMESPACES)[number]

export const DEFAULT_NAMESPACE: Namespace = 'common'

export const resources = {
  en: {
    common: enCommon,
    welcome: enWelcome,
    auth: enAuth,
    mangaka: enMangaka,
    profile: enProfile,
    assistant: enAssistant,
    admin: enAdmin,
    editor: enEditor,
    board: enBoard
  },
  vi: {
    common: viCommon,
    welcome: viWelcome,
    auth: viAuth,
    mangaka: viMangaka,
    profile: viProfile,
    assistant: viAssistant,
    admin: viAdmin,
    editor: viEditor,
    board: viBoard
  }
} as const

export const SUPPORTED_LANGUAGES = ['en', 'vi'] as const
export type Language = (typeof SUPPORTED_LANGUAGES)[number]

export const FALLBACK_LANGUAGE: Language = 'vi'
