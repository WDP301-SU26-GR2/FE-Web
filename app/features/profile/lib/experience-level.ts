export const EXPERIENCE_LEVELS = ['JUNIOR', 'MID', 'SENIOR'] as const

export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number]

export function isExperienceLevel(value: string | null | undefined): value is ExperienceLevel {
  return typeof value === 'string' && EXPERIENCE_LEVELS.some((level) => level === value)
}

export function normalizeExperienceLevel(value: string | null | undefined): ExperienceLevel | '' {
  return isExperienceLevel(value) ? value : ''
}
