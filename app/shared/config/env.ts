/**
 * Truy cập biến môi trường (Vite) đã được type-safe.
 * Quy ước: chỉ biến có prefix VITE_ mới expose ra client.
 *
 * Khi thêm biến mới:
 *   1. Thêm vào .env.local (vd: VITE_API_URL=http://...)
 *   2. Khai báo ở interface ImportMetaEnv bên dưới
 *   3. Truy cập qua `env.API_URL` (đã được trim/validate)
 */

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_URL?: string
    readonly VITE_APP_ENV?: 'development' | 'staging' | 'production'
    /** "true" để bật MSW mock. Chỉ dùng trong môi trường dev. */
    readonly VITE_ENABLE_MOCK?: string
  }

  // interface ImportMeta {
  //   readonly env: ImportMetaEnv & {
  //     readonly MODE: string
  //     readonly DEV: boolean
  //     readonly PROD: boolean
  //     readonly SSR: boolean
  //   }
  // }
}

export const env = {
  API_URL: import.meta.env.VITE_API_URL ?? '',
  APP_ENV: import.meta.env.VITE_APP_ENV ?? 'development',
  /** true khi VITE_ENABLE_MOCK=true. MSW chỉ khởi động khi flag này bật. */
  ENABLE_MOCK: import.meta.env.VITE_ENABLE_MOCK === 'true',
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
  IS_SSR: import.meta.env.SSR
} as const

export type Env = typeof env
