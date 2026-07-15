# Kiến trúc src — dành cho dev FE mới

> Tài liệu giải thích cách tổ chức source code của **mangaka-web** kèm ví dụ thực tế. Đọc file này **trước** khi code feature mới.
>
> Tài liệu liên quan: [`AGENTS.md`](./AGENTS.md) (quy ước + recipe cho AI agent), `FE-API-Guide-v3.md` (luồng nghiệp vụ + chi tiết endpoint), `swagger.json` (OpenAPI 3.0 — types).

> **System architecture diagram tổng:** xem bộ 11 diagram (C4 × 4 + ER + Sequence × 5) tại [`../Docs/Architecture-Diagrams/README.md`](../Docs/Architecture-Diagrams/README.md). File master: `Docs/Architecture-Diagrams/mangaka-architecture.drawio`. Mở nhanh gallery: `../Docs/Architecture-Diagrams/exports/gallery.html`.

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

**Giải pháp**: chia theo **lớp** (layer) + **feature** (chức năng nghiệp vụ). Với mỗi feature **lớn** (như `mangaka`, `assistant`) → chia tiếp theo **slice** (chức năng con), không phải theo loại file (`components/`, `hooks/`).

---

## 2. Mỗi thư mục làm gì? — analogy đơn giản

Hãy xem dự án như **một toà nhà**:

| Thư mục | Vai trò trong toà nhà | Trong code |
| --- | --- | --- |
| `routes/` | **Cửa ra vào** — dẫn khách tới phòng nào | URL → page nào |
| `features/<role>/<slice>/` | **Các phòng chức năng trong tầng** — phòng ngủ, bếp... | `mangaka/series`, `mangaka/chapters`, `assistant/tasks`... |
| `features/<standalone>/` | **Phòng không thuộc tầng nào** — sảnh chính | `auth`, `profile`, `welcome` |
| `shared/ui/` | **Đồ nội thất tiêu chuẩn** — ghế, bàn ai cũng dùng được | `Button`, `Input`, `Card` (generic, headless) |
| `shared/components/` | **Đồ đã ráp** — bộ bàn ăn = bàn + ghế gắn liền | `ThemeToggle`, `LanguageSwitcher`, `DashboardLayout` |
| `shared/lib/` | **Dụng cụ** — kéo, búa, thước | `cn()`, `storage`, `upload/upload-to-r2`, i18n init |
| `shared/config/` | **Bảng địa chỉ, danh bạ** | `SITE.name`, `STORAGE_KEYS`, env vars |
| `providers/` | **Hệ thống điện/nước cấp toàn nhà** | `Theme`, `i18n`, `Auth`, sau này: Toast, Query |
| `styles/` | **Bảng màu sơn** của cả toà nhà | `theme.css` — đổi 1 chỗ áp cả nhà |
| `locales/` | **Bảng song ngữ** dán mọi nơi | `en/`, `vi/` — 1 file mỗi role/feature |
| `api/` | **Đường ống ra ngoài** (do Orval đúc sẵn từ swagger) | `model/<tag>/` types, `operations/<tag>/` fetch fns |
| `mocks/` | **Bếp giả** — nấu data fake khi BE chưa sẵn sàng | MSW handlers + Faker factories (dev only) |

### Quy tắc vàng — ai được dùng ai?

```text
                ┌──────────┐
                │  routes  │   ← URL bind tới page
                └────┬─────┘
                     │ import
            ┌────────▼─────────┐
            │     features     │   ← code nghiệp vụ (auth, mangaka/series, assistant/tasks, ...)
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

- ❌ `shared/` **không bao giờ** import từ `features/` (đảo chiều phụ thuộc → vòng lặp).
- ❌ Hai **role khác nhau** không import chéo (`features/mangaka/*` ↔ `features/assistant/*`). Hai slice **cùng role** (vd `mangaka/series` ↔ `mangaka/studio`) **được** import qua `~/features/<role>/<slice>/...`. Nếu cần share giữa các role → kéo lên `shared/`.
- ❌ `features/` và `shared/` **không** import từ `mocks/` — mock chỉ tồn tại trong `mocks/` và `entry.client.tsx`.
- ❌ `api/operations/*` chỉ được gọi từ **route loader/action** hoặc **feature hook** (client-side fetch). Không gọi trực tiếp trong component render.
- ✅ `routes/` và `features/` được dùng `shared/` thoải mái.
- ✅ Provider đọc `shared/`.

---

## 3. Cấu trúc thư mục hiện tại (cập nhật sau refactor)

```
app/
├── root.tsx                              # Root layout, gắn AppProviders + theme init
├── routes.ts                             # Khai báo route (config object)
├── routes/
│   ├── home.tsx                          # landing
│   ├── auth/                             # login, register, change-password
│   ├── mangaka/                          # layout chung cho role MANGAKA
│   │   ├── _layout.tsx                   # DashboardLayout (mount 1 lần)
│   │   ├── index.tsx                     # /dashboard/mangaka
│   │   ├── series.tsx                    # /dashboard/mangaka/series (list)
│   │   ├── propose-series.tsx            # /dashboard/mangaka/series/propose (wizard)
│   │   ├── series-detail.tsx             # /dashboard/mangaka/series/:id
│   │   ├── series-edit.tsx               # /dashboard/mangaka/series/:id/edit
│   │   ├── my-studio.tsx                 # /dashboard/mangaka/studio
│   │   ├── assistant-directory.tsx       # /dashboard/mangaka/assistants
│   │   └── profile.tsx                   # /dashboard/mangaka/profile
│   ├── assistant/                        # layout riêng cho role ASSISTANT
│   │   ├── _layout.tsx
│   │   ├── index.tsx                     # /dashboard/assistant
│   │   ├── tasks.tsx                     # /dashboard/assistant/tasks
│   │   ├── invites.tsx                   # /dashboard/assistant/invites
│   │   ├── studio.tsx                    # /dashboard/assistant/studio
│   │   ├── notifications.tsx             # /dashboard/assistant/notifications
│   │   └── profile.tsx                   # /dashboard/assistant/profile
│   ├── editor/, board/, admin/           # role layout (stub — chưa có page)
│
├── features/
│   ├── auth/                             # flow đăng ký / đăng nhập / OTP
│   ├── profile/                          # hồ sơ cá nhân
│   ├── welcome/                          # landing page (FE-public)
│   │
│   ├── mangaka/                          # ROLE — phân theo slice
│   │   ├── index.ts                      # BARREL: re-export page-level
│   │   ├── dashboard/
│   │   │   └── mangaka-dashboard.tsx
│   │   ├── series/                       # proposal + series lifecycle
│   │   │   ├── my-series-page.tsx, my-series-detail-page.tsx, edit-proposal-page.tsx
│   │   │   ├── use-series-list.ts, use-series-detail.ts, use-mangaka-series.ts
│   │   │   ├── use-submit-series.ts, use-update-proposal.ts
│   │   │   └── components/
│   │   │       ├── create-proposal-wizard.tsx
│   │   │       ├── image-lightbox.tsx, submit-series-dialog.tsx
│   │   │       └── wizard-steps/         # step components
│   │   ├── chapters/                     # publication: chapter + manuscript
│   │   │   ├── create-chapter-dialog.tsx, publication-section.tsx
│   │   │   ├── use-chapter-list.ts, use-create-chapter.ts
│   │   ├── studio/                       # signed image gallery
│   │   │   ├── my-studio-page.tsx
│   │   │   ├── use-signed-image-url.ts, use-my-studio-assignments.ts
│   │   │   └── components/signed-image.tsx
│   │   ├── assistants/                   # directory + invite dialog + assignment card
│   │   │   ├── assistant-directory-page.tsx
│   │   │   ├── use-assistant-directory.ts
│   │   │   └── components/
│   │   │       ├── assistant-card.tsx, assignment-card.tsx
│   │   │       └── invite-assistant-dialog.tsx
│   │   └── invites/                      # hook tạo invite (dùng bởi assistants slice)
│   │       └── use-create-invite.ts
│   │
│   └── assistant/                        # ROLE — phân theo slice
│       ├── index.ts                      # BARREL
│       ├── dashboard/
│       │   ├── assistant-dashboard-page.tsx
│       │   └── use-assistant-dashboard-stats.ts
│       ├── tasks/                        # my tasks
│       │   ├── assistant-tasks-page.tsx
│       │   ├── use-assistant-tasks.ts
│       │   └── components/task-card.tsx
│       ├── invites/                      # collaboration invites
│       │   ├── assistant-invites-page.tsx
│       │   └── use-assistant-invites.ts
│       ├── studio/                       # my studio assignments
│       │   ├── assistant-studio-page.tsx
│       │   └── use-assistant-studio.ts
│       └── notifications/                # notifications + deep-link
│           ├── assistant-notifications-page.tsx
│           └── use-assistant-notifications.ts
│
├── shared/
│   ├── ui/                               # Button, Input, Card, Dialog...
│   ├── components/                       # ThemeToggle, LanguageSwitcher, DashboardLayout
│   ├── lib/
│   │   ├── cn.ts, storage.ts
│   │   ├── upload/upload-to-r2.ts        # cross-role: dùng bởi mangaka series + profile
│   │   └── i18n/
│   ├── config/site.ts, env.ts
│   └── types/
│
├── providers/app-providers.tsx, theme-provider.tsx, i18n-provider.tsx
├── styles/app.css, theme.css
├── locales/
│   ├── en/ common.json welcome.json auth.json profile.json mangaka.json assistant.json
│   └── vi/ (mirror đầy đủ)
├── mocks/browser.ts, handlers/, factories/
├── api/model/<tag>/, operations/<tag>/, mutator/custom-fetch.ts
└── entry.client.tsx
```

### 3.1 Quy tắc tổ chức feature (rất quan trọng)

| Quy tắc | Đặt ở đâu |
| --- | --- |
| 1 feature nghiệp vụ **độc lập, nhỏ** | `features/<name>/` (vd `features/auth`) |
| 1 role có **nhiều chức năng nghiệp vụ** | `features/<role>/<slice>/` cho **mỗi** slice (vd `mangaka/series`, `mangaka/chapters`, `mangaka/studio`...) |
| Component chỉ 1 slice dùng | `features/<role>/<slice>/components/` |
| Hook chỉ 1 slice dùng | `features/<role>/<slice>/use-xxx.ts` (co-located, không bỏ folder `hooks/`) |
| Component/hook **cross-slice cùng role** | `features/<role>/<slice-A>/...` — slice khác import qua `~/features/<role>/<slice-A>/...` |
| Component/hook **cross-role** (vd upload R2) | `shared/lib/` hoặc `shared/components/` |
| UI primitive generic | `shared/ui/` |
| App-level component đã ráp (có business meaning) | `shared/components/` |
| Helper function thuần | `shared/lib/<topic>.ts` |

### 3.2 Tại sao phải chia theo slice thay vì gộp trong 1 folder role?

Tưởng tượng role `mangaka` ban đầu (flat):

```text
features/mangaka/
├── components/             ← 10 component lẫn lộn series/chapters/studio/assistants
├── hooks/                  ← 10 hook lẫn lộn
├── pages/                  ← 6 page lẫn lộn
├── index.ts                ← 1 barrel khổng lồ
└── ... 30+ files
```

Sau 3 sprint:

- ❌ Muốn sửa 1 component của "chapters" → phải scroll qua component của "series".
- ❌ Xung đột git với người sửa "studio" vì cùng folder `components/`.
- ❌ Khi `chapters` chín muồi → tách sang microservice / package riêng → không biết file nào thuộc về nó.

**Sau refactor** (chia slice):

```text
features/mangaka/
├── dashboard/    ← cô lập hoàn toàn, dễ xoá
├── series/       ← proposal + lifecycle, test riêng được
├── chapters/     ← publication section, dễ tách package
├── studio/       ← signed image, có thể share với role khác sau
├── assistants/   ← directory + invite dialog
└── invites/      ← hook phụ trợ
```

Mỗi slice **độc lập**, **test riêng được**, **xoá được** bằng cách xoá 1 folder. Mapping slice ↔ swagger tag ↔ URL prefix giữ codebase **khớp với domain**.

### 3.3 Quy ước URL dashboard (cập nhật 2026-07)

Mọi route dashboard tuân theo pattern thống nhất:

```text
/dashboard/<role>             → init page (mount tại index của role layout)
/dashboard/<role>/<nav>       → sub-page trong nav menu của role đó
/dashboard/<role>/<resource>/:id  → detail page (vd /dashboard/mangaka/series/:id)
```

Ví dụ mapping thực tế:

| URL | Role | Trang |
| --- | --- | --- |
| `/dashboard/mangaka` | MANGAKA | Dashboard tổng quan |
| `/dashboard/mangaka/series` | MANGAKA | Danh sách series |
| `/dashboard/mangaka/series/:id` | MANGAKA | Chi tiết series |
| `/dashboard/mangaka/series/:id/edit` | MANGAKA | Sửa proposal |
| `/dashboard/mangaka/studio` | MANGAKA | Studio của Mangaka (assignments họ giao) |
| `/dashboard/mangaka/profile` | MANGAKA | Hồ sơ Mangaka |
| `/dashboard/assistant` | ASSISTANT | Dashboard tổng quan |
| `/dashboard/assistant/tasks` | ASSISTANT | Task của Assistant |
| `/dashboard/assistant/studio` | ASSISTANT | Studio của Assistant (assignment họ nhận) |
| `/dashboard/editor` | EDITOR | Dashboard Editor |
| `/dashboard/board` | BOARD | Dashboard Board |
| `/dashboard/admin` | SUPER_ADMIN | Dashboard Admin |

**Tại sao cần prefix `<role>`?**

- Trước đây URL `/dashboard/studio` được dùng chung cho cả Mangaka & Assistant (cùng URL, nghĩa khác nhau → dễ nhầm khi deep-link từ notification hoặc share link).
- Tách rời → không trùng, dễ guard theo role, dễ phân biệt "Studio của Mangaka" vs "Studio của Assistant".
- Active state trong sidebar vẫn dùng prefix match, nên `/dashboard/mangaka/series/123` vẫn highlight "My Series" (href=`/dashboard/mangaka/series`).

### 3.4 Path alias

| Alias | Trỏ đến |
| --- | --- |
| `~/features/<x>` | feature module (qua barrel `index.ts`) |
| `~/features/<role>/<slice>` | slice bên trong role (bypass barrel khi cần) |
| `~/shared/ui`, `~/shared/components`, `~/shared/lib/<topic>`, `~/shared/config/<topic>` | shared layers |
| `~/providers/<x>-provider` | provider context |
| `~/api/operations/<tag>/<tag>` | orval-generated fetch fns |
| `~/api/model/<tag>` | orval-generated TS types theo tag |
| `~/mocks/handlers`, `~/mocks/factories` | MSW (dev only) |

---

## 4. Ví dụ thực tế A: Thêm slice mới `mangaka/deadlines`

Giả sử bạn cần làm trang **`/dashboard/deadlines`** để Mangaka xem các deadline request với Editor. Slice mới này map với swagger tag `deadline-requests`.

### Bước 1 — Tạo slice

```text
app/features/mangaka/deadlines/
├── deadline-page.tsx                   # page-level component
├── use-deadlines.ts                    # fetch + state
├── components/
│   ├── deadline-card.tsx               # 1 thẻ deadline
│   └── deadline-status-badge.tsx       # badge trạng thái (enum)
├── lib/format-deadline.ts              # format date theo giờ VN
└── index.ts                            # export public surface
```

### Bước 2 — Viết code

**`features/mangaka/deadlines/use-deadlines.ts`** — hook fetch + state:

```ts
import { useCallback, useEffect, useState } from 'react'
import { deadlineControllerList } from '~/api/operations/deadline-requests/deadline-requests'
import type { DeadlineRequestResDtoOutput } from '~/api/model/deadline-requests'
import { extractApiErrorMessage } from '~/features/auth/lib/extract-api-error'

export function useDeadlines() {
  const [items, setItems] = useState<DeadlineRequestResDtoOutput[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await deadlineControllerList({ limit: 20, offset: 0 })
      // res.data = { items: DeadlineRequestResDtoOutput[], total: number }
      setItems(res.data?.items ?? [])
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Không tải được deadline'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void reload() }, [reload])

  return { items, loading, error, reload }
}
```

**`features/mangaka/deadlines/components/deadline-card.tsx`**:

```tsx
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '~/shared/ui'
import { cn } from '~/shared/lib/cn'
import type { DeadlineRequestResDtoOutput } from '~/api/model/deadline-requests'
import { DeadlineStatusBadge } from './deadline-status-badge'

type Props = { deadline: DeadlineRequestResDtoOutput }

export function DeadlineCard({ deadline }: Props) {
  const { t } = useTranslation('mangaka')
  return (
    <div className={cn('rounded-lg border border-border bg-card p-4')}>
      <div className='flex items-center justify-between'>
        <h3 className='text-base font-semibold text-card-foreground'>
          {t('deadlines.card.title', { chapter: deadline.chapterNumber })}
        </h3>
        <DeadlineStatusBadge status={deadline.status} />
      </div>
      <p className='mt-2 text-sm text-muted-foreground'>
        {t('deadlines.card.proposedDate', { date: deadline.proposedDate })}
      </p>
      <p className={cn('mt-2 text-sm', deadline.reason && 'text-foreground')}>
        {deadline.reason ?? t('deadlines.card.noReason')}
      </p>
    </div>
  )
}
```

**`features/mangaka/deadlines/deadline-page.tsx`** — page chính:

```tsx
import { useTranslation } from 'react-i18next'
import { RefreshCw, Loader2 } from 'lucide-react'

import { Button } from '~/shared/ui'
import { cn } from '~/shared/lib/cn'
import { useDeadlines } from './use-deadlines'
import { DeadlineCard } from './components/deadline-card'

export function DeadlinePage() {
  const { t } = useTranslation('mangaka')
  const { items, loading, error, reload } = useDeadlines()

  if (loading) return <Loader2 className='mx-auto animate-spin' />
  if (error) return <p className='text-destructive'>{error}</p>
  if (items.length === 0) return <p>{t('deadlines.list.empty')}</p>

  return (
    <main className='container mx-auto p-6'>
      <header className='mb-4 flex items-center justify-between'>
        <h1 className='text-2xl font-bold text-foreground'>{t('deadlines.title')}</h1>
        <Button variant='secondary' onClick={reload} className={cn('gap-2')}>
          <RefreshCw className='size-4' />
          {t('common.refresh')}
        </Button>
      </header>
      <div className='grid gap-4'>
        {items.map((d) => <DeadlineCard key={d.id} deadline={d} />)}
      </div>
    </main>
  )
}
```

**`features/mangaka/deadlines/index.ts`** — public API:

```ts
export { DeadlinePage } from './deadline-page'
```

### Bước 3 — Thêm bản dịch (namespace = role)

`app/locales/en/mangaka.json` (thêm key mới vào file đã có):

```jsonc
{
  "common": { "refresh": "Refresh" },
  "deadlines": {
    "title": "Deadlines",
    "list": { "empty": "No deadline requests yet." },
    "card": {
      "title": "Chapter {{chapter}}",
      "proposedDate": "Proposed: {{date}}",
      "noReason": "(No reason given)"
    }
  }
}
```

`app/locales/vi/mangaka.json`:

```jsonc
{
  "common": { "refresh": "Làm mới" },
  "deadlines": {
    "title": "Deadline",
    "list": { "empty": "Chưa có yêu cầu deadline nào." },
    "card": {
      "title": "Chương {{chapter}}",
      "proposedDate": "Đề xuất: {{date}}",
      "noReason": "(Không có lý do)"
    }
  }
}
```

### Bước 4 — Public API qua barrel của role

Sửa `app/features/mangaka/index.ts`:

```ts
// thêm dòng này
export { DeadlinePage } from './deadlines/deadline-page'
```

### Bước 5 — Tạo route

`app/routes/mangaka/deadlines.tsx`:

```tsx
import { DeadlinePage } from '~/features/mangaka'
import type { Route } from './+types/deadlines'

export function meta({}: Route.MetaArgs) {
  return [{ title: 'Deadlines - MangakaStudio Pro' }]
}

export default function DashboardDeadlinesRoute() {
  return <DeadlinePage />
}
```

Đăng ký trong `app/routes.ts` (bên trong `layout('routes/mangaka/_layout.tsx', [...])`):

```ts
route('dashboard/deadlines', 'routes/mangaka/deadlines.tsx'),
```

**Xong!** URL `/dashboard/deadlines` đã chạy. Toàn bộ code deadline gói gọn trong `features/mangaka/deadlines/`. Muốn xoá → xoá folder + 1 dòng barrel + 1 dòng route + key i18n.

---

## 5. Ví dụ thực tế B: Cross-slice cùng role (giải thích `SignedImage`)

`SignedImage` được tạo ở `mangaka/studio/components/signed-image.tsx` (vì studio là nơi sinh ra nó). Nhưng slice `mangaka/series/components/wizard-steps/basic-info-step.tsx` cũng dùng (để preview cover khi tạo proposal).

Import **không** qua barrel của role, mà **trực tiếp** vào slice sở hữu:

```tsx
// mangaka/series/components/wizard-steps/basic-info-step.tsx
import { SignedImage } from '~/features/mangaka/studio/components/signed-image'
```

Nếu slice khác **role** (vd `assistant/*` chưa cần, nhưng `profile` đã dùng) cũng OK — chỉ cần đổi path:

```tsx
// features/profile/components/portfolio-uploader.tsx
import { SignedImage } from '~/features/mangaka/studio/components/signed-image'
```

`SignedImage` thuộc `mangaka/studio/` vì studio là nơi **sinh ra** nó. Profile **dùng** nó — vẫn hợp lệ vì profile không thuộc role `mangaka`, nhưng không có chuẩn nào cấm `profile` import từ `mangaka`. Quy tắc cấm chỉ áp cho **hai role khác nhau** import chéo (`mangaka` ↔ `assistant`).

> **Quy tắc tổng quát:** nếu 2+ role khác nhau đều dùng → **kéo lên `shared/`** (vd `upload-to-r2.ts` đã làm vậy). Nếu chỉ 1 role dùng → để trong role đó, slice nào sở hữu đặt ở slice đó.

---

## 6. Khi nào kéo lên `shared/`?

**Quy tắc kinh nghiệm:** chỉ kéo lên khi có **2+ role khác nhau** dùng. Đừng "premature share".

### Phân biệt `shared/ui/` vs `shared/components/`

| `shared/ui/` | `shared/components/` |
| --- | --- |
| Generic, headless, không có business | Có business meaning, đã ráp |
| `Button`, `Input`, `Card`, `Dialog` | `ThemeToggle`, `LanguageSwitcher`, `AppHeader`, `DashboardLayout` |
| Có thể copy sang dự án khác | Chỉ làm việc trong dự án này |
| Phụ thuộc: chỉ Tailwind + `cn()` | Phụ thuộc: provider, hook, config của app |

---

## 7. Ví dụ ngắn: dùng `cn()` để merge class

```tsx
import { cn } from '~/shared/lib/cn'

function Card({ className, isActive }: { className?: string; isActive: boolean }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border p-4', // base
        isActive && 'ring-2 ring-ring',        // conditional
        className                              // override từ ngoài
      )}
    />
  )
}

// Dùng:
;<Card className='bg-primary' isActive />
// → tailwind-merge tự loại class trùng, giữ class sau (override class trước)
```

---

## 8. Response envelope & error handling (từ `FE-API-Guide-v3.md` §0)

**Mọi response thành công:**

```jsonc
{ "success": true, "message": "Success", "data": { /* payload */ } }
```

→ `customFetch` đã unwrap sẵn — payload nằm ở `res.data`.

**Mọi response lỗi:**

```jsonc
// Field-level (422 validation):
{ "success": false, "statusCode": 422, "message": "Invalid email",
  "errors": [ { "message": "Invalid email", "path": "email" } ] }

// Lỗi đơn (403):
{ "success": false, "statusCode": 403, "message": "Error.EmailNotVerified" }

// Rate-limit (429):
{ "success": false, "statusCode": 429, "message": "Error.OtpRateLimited",
  "code": "AUTH_OTP_RATE_LIMITED", "retryAfter": 60 }
```

**Quy tắc FE:**

- `message.Error.PascalCase` là **code** để map qua i18n sang text hiển thị. **KHÔNG** hiển thị raw code cho user.
- Dùng `extractApiErrorMessage(err, fallback)` ở `~/features/auth/lib/extract-api-error.ts` để extract an toàn.
- Status code quan trọng: **422 = validation** (KHÔNG phải 400); **403 = sai role/scope**; **409 = state machine sai**; **410 = OTP hết hạn**.

Xem chi tiết đầy đủ state machine trong `FE-API-Guide-v3.md` §1 (60 enum) và recipe gọi API trong [`AGENTS.md`](./AGENTS.md) §8.

---

## 9. Mock API — code FE độc lập với BE

**Hoàn cảnh:** BE chưa sẵn sàng, nhưng FE phải code sẵn UI + flow. Giải pháp: **MSW + Faker**.

### 9.1 Cách hoạt động

```text
component / hook gọi fetch("/api/mangas")
       │
       ▼
[ MSW Service Worker (browser) ]   ← chỉ active khi VITE_ENABLE_MOCK=true
       │
       ▼
handler trong app/mocks/handlers/  ← khớp URL → trả Faker data (hoặc generated handler từ Orval)
       │
       ▼
component nhận response như API thật
```

### 9.2 Thêm 1 endpoint mock mới

**Bước 1** — factory `app/mocks/factories/deadline.factory.ts`:

```ts
import { faker } from '@faker-js/faker'
import type { DeadlineRequestResDtoOutput } from '~/api/model/deadline-requests'

export function createDeadline(overrides: Partial<DeadlineRequestResDtoOutput> = {}): DeadlineRequestResDtoOutput {
  return {
    id: faker.string.uuid(),
    chapterNumber: faker.number.int({ min: 1, max: 50 }),
    status: 'PROPOSED',
    proposedDate: faker.date.future().toISOString(),
    reason: faker.lorem.sentence(),
    ...overrides
  }
}
```

**Bước 2** — handler `app/mocks/handlers/deadline.handler.ts`:

```ts
import { http, HttpResponse } from 'msw'
import { createDeadline } from '../factories/deadline.factory'

export const deadlineHandlers = [
  http.get('/api/deadline-requests', () =>
    HttpResponse.json({
      success: true,
      message: 'OK',
      data: { items: Array.from({ length: 10 }, () => createDeadline()), total: 10 }
    })
  )
]
```

> **Lưu ý:** response phải bọc envelope `{success, message, data}` để khớp với FE.

**Bước 3** — đăng ký vào `app/mocks/handlers/index.ts`:

```ts
import { deadlineHandlers } from './deadline.handler'
export const handlers = [...exampleHandlers, ...deadlineHandlers]
```

Restart dev server → `fetch("/api/deadline-requests")` đã trả data fake.

### 9.3 Khi BE giao swagger.json

Switch sang Orval:

1. Đặt `swagger.json` ở root, hoặc đổi URL trong [`orval.config.ts`](./orval.config.ts).
2. Chạy `npm run orval` → auto-generate:
   - `app/api/model/<tag>/` — TS types khớp 100% swagger, chia theo tag.
   - `app/api/operations/<tag>/<tag>.ts` — fetch functions sẵn dùng.
   - `app/api/operations/<tag>/<tag>.msw.ts` — MSW handler từ swagger examples.
3. Trong [`app/mocks/handlers/index.ts`](./app/mocks/handlers/index.ts), import generated handlers, **xoá** handler tay tương ứng.
4. Trong factory: thay `export type X = {...}` → `import type { X } from "~/api/model/<tag>"`.
5. Trong feature, không gọi `fetch` thẳng nữa — dùng generated function:

```ts
// trong hook (client-side)
import { deadlineControllerList } from '~/api/operations/deadline-requests/deadline-requests'
const res = await deadlineControllerList({ limit: 20, offset: 0 })
const items = res.data?.items ?? [] // ← envelope đã unwrap, data có thể là {items, total}
```

⚠️ **KHÔNG** viết code tay trong `app/api/model/` và `app/api/operations/` — Orval xoá sạch khi chạy lại. Customize fetch behavior (auth header, error handling, envelope unwrap) trong [`app/api/mutator/custom-fetch.ts`](./app/api/mutator/custom-fetch.ts).

### 9.4 Bật / tắt mock

`.env.local`:

```env
VITE_ENABLE_MOCK=true   # bật MSW (dev)
VITE_ENABLE_MOCK=false  # tắt, gọi API thật qua VITE_API_URL
```

Khi tắt, code MSW bị **tree-shake** khỏi production bundle (dynamic import trong [`app/entry.client.tsx`](./app/entry.client.tsx)).

---

## 10. Cheatsheet — khi cần làm X, mở file nào?

| Việc cần làm | Mở file |
| --- | --- |
| Đổi màu chủ đạo | `app/styles/theme.css` |
| Thêm key dịch | `app/locales/{en,vi}/<namespace>.json` (namespace = role hoặc feature) |
| Thêm namespace mới | `app/shared/lib/i18n/resources.ts` |
| Thêm trang mới cho role đã có | tạo slice `features/<role>/<slice>/...` + route (xem mục 4) |
| Thêm role mới | `features/<role>/<slice>/...` + `routes/<role>/_layout.tsx` + `routes.ts` |
| Thêm UI primitive | `app/shared/ui/` |
| Thêm provider mới | `app/providers/` + ráp vào `app-providers.tsx` |
| Thêm env var | `.env.local` (+ `.env.example`) + `app/shared/config/env.ts` |
| Thêm hằng số toàn app | `app/shared/config/site.ts` |
| Thêm helper thuần | `app/shared/lib/<topic>.ts` |
| Thêm mock endpoint | `app/mocks/factories/` + `app/mocks/handlers/` (xem mục 9) |
| Bật / tắt mock | `.env.local` → `VITE_ENABLE_MOCK` |
| Codegen từ swagger | đặt `swagger.json` + `npm run orval` |
| Đọc state machine / enum | `FE-API-Guide-v3.md` §1 (60 enum) |
| Đọc business flow | `FE-API-Guide-v3.md` §0–§10 |

---

## 11. TL;DR — 4 nguyên tắc đáng nhớ nhất

1. **1 chức năng nghiệp vụ = 1 slice trong `features/<role>/<slice>/`** (hoặc `features/<x>/` nếu là feature độc lập). Muốn xoá → xoá 1 folder + 1 dòng barrel + 1 dòng route.
2. **Mọi màu đi qua token `theme.css`**, không hard-code hex. Đổi màu = sửa 1 file.
3. **`shared/` không biết gì về `features/`. Hai role khác nhau không import chéo.** Hai slice cùng role thì OK. Vi phạm = vòng lặp dependency = code thối.
4. **API đi qua Orval**, response unwrap ở `res.data`, error message có dạng `Error.PascalCase` phải map i18n trước khi hiển thị.

Khi phân vân "đặt file này ở đâu?", hỏi 4 câu:

- Cái này có **business meaning** không? (có → `features/`; không → `shared/ui/` hoặc `shared/lib/`)
- Thuộc **role nào** (Mangaka/Assistant/Editor)? → `features/<role>/`
- Thuộc **chức năng con nào** trong role? → `features/<role>/<slice>/`
- Có **2+ role** dùng không? (có → `shared/`; chỉ 1 role → giữ trong role đó, đặt slice nào sở hữu đặt slice đó)

---

_Có chỗ nào khó hiểu hỏi senior trong team, hoặc đọc kèm [`AGENTS.md`](./AGENTS.md) để xem chi tiết quy ước + recipe._