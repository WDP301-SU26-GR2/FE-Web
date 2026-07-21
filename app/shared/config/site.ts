/**
 * Hằng số cấp ứng dụng dùng chung. Thay đổi tên thương hiệu / link
 * mạng xã hội tại đây thay vì rải rác trong component.
 */

export const SITE = {
  name: 'Manga Creation Workflow and Publishing Management System',
  shortName: 'Manga Creation',
  description: 'Manga creation workflow and publishing management system',
  logoUrl:
    'https://res.cloudinary.com/dbsbfvz2f/image/upload/f_auto,q_auto/Gemini_Generated_Image_d713d4d713d4d713_hlbjvd.png',
  url: 'https://mangaka.example.com',
  defaultLocale: 'vi' as const
} as const

/** Các key dùng cho localStorage — gom 1 chỗ để tránh typo. */
export const STORAGE_KEYS = {
  theme: 'mangaka-theme',
  language: 'mangaka-lang',
  accessToken: 'mangaka-access-token',
  refreshToken: 'mangaka-refresh-token',
  /** Cached login user profile (JSON string of LoginResDtoOutputUser). */
  user: 'mangaka-user',
  /** Email đang chờ verify (đăng ký) — xoá sau khi verify thành công. */
  pendingRegisterEmail: 'mangaka-pending-register-email'
} as const
