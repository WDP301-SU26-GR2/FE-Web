# Kiến trúc src — dành cho dev FE mới

> Tài liệu giải thích cách tổ chức source code của **mangaka-web** kèm ví dụ thực tế. Đọc file này trước khi code feature mới.
>
> Tài liệu liên quan: [`AGENTS.md`](./AGENTS.md) (chi tiết quy ước & API), [`README.md`](./README.md) (setup & scripts).

> **System architecture diagram tổng:** Xem bộ 11 diagram (C4 × 4 + ER + Sequence × 5) tại [`../Docs/Architecture-Diagrams/README.md`](../Docs/Architecture-Diagrams/README.md). File master: `Docs/Architecture-Diagrams/mangaka-architecture.drawio`. Mở nhanh gallery: `../Docs/Architecture-Diagrams/exports/gallery.html`.

---

## 1. Tại sao phải tách như vậy?

Tưởng tượng bạn nhét **tất cả code vào 1 thư mục `app/components/`**:

```text
app/components/
├── login-form.tsx
├── login-button.tsx
├── manga-card.tsx
├── manga-list.tsx
├── button.tsx              ← cái nào là button chung? cái nào của manga?
├── user-avatar.tsx
├── header.tsx
├── theme-toggle.tsx
├── ... 50 files khác
```

Sau 3 tháng:

- ❌ Không biết file nào dùng cho feature nào.
- ❌ Sửa `button.tsx` → vỡ chỗ khác mà không biết.
- ❌ Muốn xoá feature "manga" → phải mò 20 file.
- ❌ Dev mới vào không biết bắt đầu từ đâu.

**Giải pháp**: chia theo **lớp** (layer) và **feature** (chức năng nghiệp vụ).

---

## 2. Mỗi thư mục làm gì? — analogy đơn giản

Hãy xem dự án như **một toà nhà**:

| Thư mục              | Vai trò trong toà nhà                                   | Trong code                                |
| -------------------- | ------------------------------------------------------- | ----------------------------------------- |
| `routes/`            | **Cửa ra vào** — dẫn khách tới phòng nào                | URL → page nào                            |
| `features/`          | **Các phòng chức năng** — phòng ngủ, bếp, phòng tắm...  | Auth, Manga, Chapter, Profile, Payment... |
| `shared/ui/`         | **Đồ nội thất tiêu chuẩn** — ghế, bàn ai cũng dùng được | Button, Input, Card (generic)             |
| `shared/components/` | **Đồ đã ráp** — bộ bàn ăn = bàn + ghế gắn liền          | ThemeToggle, LanguageSwitcher (đã ráp)    |
| `shared/lib/`        | **Dụng cụ** — kéo, búa, thước                           | `cn()`, `storage`, i18n init              |
| `shared/config/`     | **Bảng địa chỉ, danh bạ**                               | `SITE.name`, `STORAGE_KEYS`, env vars     |
| `providers/`         | **Hệ thống điện/nước cấp toàn nhà**                     | Theme, i18n, sau này: Auth, Toast, Query  |
| `styles/`            | **Bảng màu sơn** của cả toà nhà                         | `theme.css` — đổi 1 chỗ áp cả nhà         |
| `locales/`           | **Bảng song ngữ** dán mọi nơi                           | `en/`, `vi/` — dịch theo namespace        |
| `api/`               | **Đường ống ra ngoài** (do Orval đúc sẵn từ swagger)    | `model/` types, `operations/` fetch fns   |
| `mocks/`             | **Bếp giả** — nấu data fake khi BE chưa sẵn sàng        | MSW handlers + Faker factories (dev only) |

### Quy tắc vàng — ai được dùng ai?

```text
                ┌──────────┐
                │  routes  │   ← URL bind tới page
                └────┬─────┘
                     │ import
            ┌────────▼─────────┐
            │     features     │   ← code nghiệp vụ (Auth, Manga, Chapter...)
            └────────┬─────────┘
                     │ import
            ┌────────▼─────────┐
            │     shared       │   ← đồ dùng chung
            └──────────────────┘
                     ▲
                     │ import
            ┌────────┴─────────┐
            │    providers     │   ← context cấp app
            └──────────────────┘
```

**Quy tắc cấm:**

- ❌ `shared/` **không bao giờ** import từ `features/` (đảo lộn chiều phụ thuộc → vòng lặp).
- ❌ `features/auth` **không** import từ `features/manga` (2 phòng độc lập). Nếu cần share, kéo lên `shared/`.
- ❌ `features/` và `shared/` **không** import từ `mocks/` — mock chỉ tồn tại trong `mocks/` và `entry.client.tsx`.
- ❌ `api/operations/*` chỉ được gọi từ **route loader/action** (hoặc feature hook nếu cần client-side fetch). Không gọi trực tiếp trong component render.
- ✅ `routes/` và `features/` được dùng `shared/` thoải mái.

---

## 3. Ví dụ thực tế: Thêm feature "Manga" từ A đến Z

Giả sử bạn cần làm trang **`/mangas`** hiển thị danh sách truyện.

### Bước 1 — Tạo cấu trúc feature

```text
app/features/manga/
├── components/
│   ├── manga-card.tsx          # 1 thẻ truyện
│   └── manga-list.tsx          # danh sách
├── hooks/
│   └── use-mangas.ts           # custom hook fetch mangas
├── api/
│   └── manga-api.ts            # gọi API manga
├── types.ts                    # type Manga
├── manga-page.tsx              # trang chính ráp lại
└── index.ts                    # public API barrel
```

### Bước 2 — Viết code

**`features/manga/types.ts`** — định nghĩa type:

```ts
export type Manga = {
  id: string
  title: string
  description: string
  coverUrl: string
  author: string
}
```

**`features/manga/api/manga-api.ts`** — gọi API:

```ts
import type { Manga } from '../types'

// `fetch` đi qua MSW khi VITE_ENABLE_MOCK=true → trả về data fake từ
// app/mocks/handlers/. Khi BE có swagger thật, KHÔNG viết tay nữa —
// chuyển sang dùng generated function `getMangas()` từ `~/api/operations`.
export async function fetchMangas(): Promise<Manga[]> {
  const res = await fetch('/api/mangas')
  if (!res.ok) throw new Error('Failed to fetch mangas')
  const body = (await res.json()) as { items: Manga[] }
  return body.items
}
```

> **Lưu ý mock-first:** project hiện setup MSW + Faker. Bạn code FE độc lập với BE — chỉ cần URL khớp với handler trong [`app/mocks/handlers/`](./app/mocks/handlers/). Xem mục **6** bên dưới để hiểu workflow.

**`features/manga/hooks/use-mangas.ts`** — hook tái sử dụng:

```ts
import { useEffect, useState } from 'react'
import type { Manga } from '../types'
import { fetchMangas } from '../api/manga-api'

export function useMangas() {
  const [mangas, setMangas] = useState<Manga[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMangas().then((data) => {
      setMangas(data)
      setLoading(false)
    })
  }, [])

  return { mangas, loading }
}
```

**`features/manga/components/manga-card.tsx`** — UI từng item:

```tsx
import { useTranslation } from 'react-i18next'
import { Button } from '~/shared/ui'
import type { Manga } from '../types'

export function MangaCard({ manga }: { manga: Manga }) {
  const { t } = useTranslation('manga')
  return (
    <article className='rounded-lg border border-border bg-card p-4'>
      <img src={manga.coverUrl} alt={manga.title} className='rounded' />
      <h3 className='mt-2 font-semibold text-card-foreground'>{manga.title}</h3>
      <p className='text-muted-foreground'>{manga.description}</p>
      <Button variant='primary' className='mt-3'>
        {t('read')}
      </Button>
    </article>
  )
}
```

**`features/manga/components/manga-list.tsx`**:

```tsx
import { useTranslation } from 'react-i18next'
import { useMangas } from '../hooks/use-mangas'
import { MangaCard } from './manga-card'

export function MangaList() {
  const { t } = useTranslation('common')
  const { mangas, loading } = useMangas()

  if (loading) return <p>{t('loading')}</p>
  return (
    <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
      {mangas.map((m) => (
        <MangaCard key={m.id} manga={m} />
      ))}
    </div>
  )
}
```

**`features/manga/manga-page.tsx`** — ráp tất cả:

```tsx
import { useTranslation } from 'react-i18next'
import { MangaList } from './components/manga-list'

export function MangaPage() {
  const { t } = useTranslation('manga')
  return (
    <main className='container mx-auto p-6'>
      <h1 className='text-2xl font-bold text-foreground'>{t('title')}</h1>
      <MangaList />
    </main>
  )
}
```

**`features/manga/index.ts`** — public API (chỉ export cái nào bên ngoài được dùng):

```ts
export { MangaPage } from './manga-page'
export type { Manga } from './types'
```

### Bước 3 — Thêm bản dịch

`app/locales/en/manga.json`:

```json
{
  "title": "Mangas",
  "read": "Read now"
}
```

`app/locales/vi/manga.json`:

```json
{
  "title": "Truyện tranh",
  "read": "Đọc ngay"
}
```

Đăng ký namespace trong `app/shared/lib/i18n/resources.ts`:

```ts
import enManga from '~/locales/en/manga.json'
import viManga from '~/locales/vi/manga.json'

export const NAMESPACES = ['common', 'welcome', 'manga'] as const
//                                              ^^^^^^^ thêm

export const resources = {
  en: { common: enCommon, welcome: enWelcome, manga: enManga },
  vi: { common: viCommon, welcome: viWelcome, manga: viManga }
}
```

### Bước 4 — Mount vào URL

`app/routes/mangas.tsx` (route thin — chỉ wrap feature):

```tsx
import { MangaPage } from '~/features/manga'
import type { Route } from './+types/mangas'

export function meta({}: Route.MetaArgs) {
  return [{ title: 'Truyện tranh - Mangaka' }]
}

export default function Mangas() {
  return <MangaPage />
}
```

Đăng ký vào `app/routes.ts`:

```ts
import { type RouteConfig, index, route } from '@react-router/dev/routes'

export default [
  index('routes/home.tsx'),
  route('mangas', 'routes/mangas.tsx') // ← thêm dòng này
] satisfies RouteConfig
```

**Xong!** URL `/mangas` đã chạy. Tất cả code manga gói gọn trong `features/manga/`. Muốn xoá feature → xoá nguyên thư mục đó + 1 dòng trong `routes.ts` + 2 file json. Không ảnh hưởng feature khác.

---

## 4. Khi nào kéo lên `shared/`?

**Quy tắc kinh nghiệm:** chỉ kéo lên khi có **2 feature trở lên** dùng. Đừng "premature share".

### Ví dụ: `<Avatar />` ban đầu chỉ dùng trong `features/profile`

→ Để ở `features/profile/components/avatar.tsx`.

Sau này `features/manga` cũng cần show avatar tác giả → **lúc đó** kéo lên `app/shared/components/avatar.tsx`. Sửa import 2 chỗ là xong.

### Phân biệt `shared/ui/` vs `shared/components/`

| `shared/ui/`                         | `shared/components/`                           |
| ------------------------------------ | ---------------------------------------------- |
| Generic, headless, không có business | Có business meaning, đã ráp                    |
| `Button`, `Input`, `Card`, `Dialog`  | `ThemeToggle`, `LanguageSwitcher`, `AppHeader` |
| Có thể copy sang dự án khác          | Chỉ làm việc trong dự án này                   |
| Phụ thuộc: chỉ Tailwind + `cn()`     | Phụ thuộc: provider, hook, config của app      |

---

## 5. Ví dụ ngắn: dùng `cn()` để merge class

```tsx
import { cn } from '~/shared/lib/cn'

function Card({ className, isActive }: { className?: string; isActive: boolean }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border p-4', // base
        isActive && 'ring-2 ring-ring', // conditional
        className // override từ ngoài
      )}
    />
  )
}

// Dùng:
;<Card className='bg-primary' isActive />
// → tailwind-merge tự loại class trùng, giữ class sau (override class trước)
```

---

## 6. Mock API — code FE độc lập với BE

**Hoàn cảnh:** BE chưa sẵn sàng, nhưng FE phải code sẵn UI + flow. Giải pháp: **MSW + Faker**.

### 6.1 Cách hoạt động

```text
component / hook gọi fetch("/api/mangas")
       │
       ▼
[ MSW Service Worker (browser) ]   ← chỉ active khi VITE_ENABLE_MOCK=true
       │
       ▼
handler trong app/mocks/handlers/  ← khớp URL → trả Faker data
       │
       ▼
component nhận response như API thật
```

### 6.2 Thêm 1 endpoint mock mới

**Ví dụ:** thêm `GET /api/mangas/:mangaId/chapters` trả về list chương.

**Bước 1** — factory `app/mocks/factories/chapter.factory.ts`:

```ts
import { faker } from '@faker-js/faker'

export type Chapter = { id: string; mangaId: string; title: string; pageCount: number }

export function createChapter(overrides: Partial<Chapter> = {}): Chapter {
  return {
    id: faker.string.uuid(),
    mangaId: faker.string.uuid(),
    title: faker.lorem.words(4),
    pageCount: faker.number.int({ min: 10, max: 60 }),
    ...overrides
  }
}
```

**Bước 2** — handler `app/mocks/handlers/chapter.handler.ts`:

```ts
import { http, HttpResponse } from 'msw'
import { createChapter } from '../factories/chapter.factory'

export const chapterHandlers = [
  http.get('/api/mangas/:mangaId/chapters', () => HttpResponse.json(Array.from({ length: 10 }, () => createChapter())))
]
```

**Bước 3** — đăng ký vào `app/mocks/handlers/index.ts`:

```ts
import { chapterHandlers } from './chapter.handler'

export const handlers = [...exampleHandlers, ...chapterHandlers]
```

Restart dev server → `fetch("/api/mangas/abc/chapters")` đã trả data fake.

### 6.3 Khi BE giao swagger.json

Switch sang Orval:

1. Đặt `swagger.json` ở root, hoặc đổi URL trong [`orval.config.ts`](./orval.config.ts).
2. Chạy `npm run orval` → auto-generate:
   - `app/api/model/` — TS types khớp 100% swagger
   - `app/api/operations/` — fetch functions sẵn dùng (`getMangas()`, `createChapter()`...)
   - `app/api/operations/**/*.msw.ts` — MSW handler từ swagger examples
3. Trong [`app/mocks/handlers/index.ts`](./app/mocks/handlers/index.ts), import generated handlers, **xoá** handler tay tương ứng.
4. Trong factory: thay `export type Manga = {...}` → `import type { Manga } from "~/api/model"`.
5. Trong feature, không gọi `fetch` thẳng nữa — dùng generated function:

```ts
// route loader (preferred)
import { getMangas } from '~/api/operations'

export async function loader() {
  return { mangas: await getMangas() }
}
```

⚠️ **KHÔNG** viết code tay trong `app/api/model/` và `app/api/operations/` — Orval xoá sạch khi chạy lại. Customize fetch behavior (auth header, error handling) trong [`app/api/mutator/custom-fetch.ts`](./app/api/mutator/custom-fetch.ts).

### 6.4 Bật / tắt mock

`.env.local`:

```env
VITE_ENABLE_MOCK=true   # bật MSW (dev)
VITE_ENABLE_MOCK=false  # tắt, gọi API thật qua VITE_API_URL
```

Khi tắt, code MSW bị **tree-shake** khỏi production bundle (dynamic import trong [`app/entry.client.tsx`](./app/entry.client.tsx)).

---

## 7. Cheatsheet — khi cần làm X, mở file nào?

| Việc cần làm                         | Mở file                                                      |
| ------------------------------------ | ------------------------------------------------------------ |
| Đổi màu chủ đạo                      | `app/styles/theme.css`                                       |
| Thêm key dịch                        | `app/locales/{en,vi}/<namespace>.json`                       |
| Thêm namespace mới                   | `app/shared/lib/i18n/resources.ts`                           |
| Thêm trang mới                       | `app/routes/<name>.tsx` + `app/routes.ts`                    |
| Thêm feature mới                     | tạo `app/features/<name>/` (xem mục 3)                       |
| Thêm UI primitive (Button, Input...) | `app/shared/ui/`                                             |
| Thêm provider mới (Toast, Query...)  | `app/providers/` + ráp vào `app-providers.tsx`               |
| Thêm env var                         | `.env.local` (+ `.env.example`) + `app/shared/config/env.ts` |
| Thêm hằng số toàn app                | `app/shared/config/site.ts`                                  |
| Thêm helper thuần (date format, ...) | `app/shared/lib/<topic>.ts`                                  |
| Thêm mock endpoint                   | `app/mocks/factories/` + `app/mocks/handlers/` (xem mục 6)   |
| Bật / tắt mock                       | `.env.local` → `VITE_ENABLE_MOCK`                            |
| Codegen từ swagger                   | đặt `swagger.json` + `npm run orval`                         |

---

## 8. TL;DR — 3 nguyên tắc đáng nhớ nhất

1. **1 feature = 1 thư mục độc lập trong `features/`**. Muốn xoá → xoá 1 thư mục.
2. **Mọi màu đi qua token `theme.css`**, không hard-code hex. Đổi màu = sửa 1 file.
3. **`shared/` không biết gì về `features/`**. Vi phạm = vòng lặp dependency = code thối.
4. **BE chưa có?** Không sao — viết handler trong `mocks/`, dev FE độc lập. Khi BE giao swagger → `npm run orval` lấy types thật, xoá mock tay.

Khi phân vân "đặt file này ở đâu?", hỏi 2 câu:

- Cái này có **business meaning** không? (có → `features/` hoặc `shared/components/`; không → `shared/ui/` hoặc `shared/lib/`)
- Có **2+ feature** sẽ dùng không? (có → `shared/`; chỉ 1 → `features/<x>/components/`)

---

_Có chỗ nào khó hiểu hỏi senior trong team, hoặc đọc kèm [`AGENTS.md`](./AGENTS.md) để xem chi tiết quy ước._
