# Prompt: Add Route

Dang ky 1 route moi vao react-router v7, giu route file thin.

## Input

`<url-path> <feature-name>` (vd `mangas manga` -> URL `/mangas` mount `~/features/manga`).

## Steps

### 1. Kiem tra feature ton tai

- Doc `app/features/<feature-name>/index.ts`.
- Chua co -> STOP, yeu cau user chay `new-feature.md` truoc.
- Lay ten page component export ra (vd `MangaPage`).

### 2. Tao route entry

Tao `app/routes/<url-path>.tsx` THIN:

```tsx
import { XxxPage } from '~/features/<feature-name>'
import type { Route } from './+types/<url-path>'

export function meta({}: Route.MetaArgs) {
  return [{ title: '<Title> - Mangaka' }, { name: 'description', content: '<desc>' }]
}

export default function <UrlPathPascal>() {
  return <XxxPage />
}
```

Tieu de lay tu i18n neu kha thi, hoac placeholder + hoi user.

### 3. Dang ky vao routes.ts

Mo `app/routes.ts`, them dong:

```ts
route("<url-path>", "routes/<url-path>.tsx"),
```

vao mang default export.

### 4. Verify

- `pnpm typecheck` (chay `react-router typegen` sinh types `.react-router/types`).
- Bao URL day du (vd `http://localhost:5173/mangas`).

## Cam

- KHONG dat business logic / fetch / state trong route file — keo vao feature.
- KHONG tao route khi chua co feature tuong ung.
