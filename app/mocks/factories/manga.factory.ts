import { faker } from '@faker-js/faker'

/**
 * Factory cho Manga entity.
 *
 * Quy ước:
 *   - create<Entity>(overrides?)  → 1 object
 *   - create<Entity>List(n, overrides?) → mảng n objects
 *
 * TODO (sau khi Orval chạy lần đầu):
 *   Xoá `export type Manga` bên dưới và thay bằng:
 *     import type { Manga } from "~/api/model/series";
 *   Lý do: giữ single source of truth — types do BE/swagger định nghĩa,
 *   factory chỉ chịu trách nhiệm sinh data fake khớp với type đó.
 */

export type MangaStatus = 'ongoing' | 'completed' | 'hiatus'

export type Manga = {
  id: string
  title: string
  description: string
  coverUrl: string
  author: string
  artist: string
  status: MangaStatus
  genres: string[]
  chapterCount: number
  viewCount: number
  rating: number
  publishedAt: string
}

const GENRES = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Fantasy',
  'Horror',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Slice of Life'
]

export function createManga(overrides: Partial<Manga> = {}): Manga {
  return {
    id: faker.string.uuid(),
    title: faker.lorem.words({ min: 2, max: 5 }),
    description: faker.lorem.paragraph(),
    coverUrl: faker.image.url({ width: 480, height: 720 }),
    author: faker.person.fullName(),
    artist: faker.person.fullName(),
    status: faker.helpers.arrayElement<MangaStatus>(['ongoing', 'completed', 'hiatus']),
    genres: faker.helpers.arrayElements(GENRES, { min: 1, max: 4 }),
    chapterCount: faker.number.int({ min: 1, max: 300 }),
    viewCount: faker.number.int({ min: 0, max: 1_000_000 }),
    rating: faker.number.float({ min: 3, max: 5, fractionDigits: 1 }),
    publishedAt: faker.date.past({ years: 5 }).toISOString(),
    ...overrides
  }
}

export function createMangaList(count = 10, overrides: Partial<Manga> = {}): Manga[] {
  return Array.from({ length: count }, () => createManga(overrides))
}
