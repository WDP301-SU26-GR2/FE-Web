# Prompt: Defensive Programming

Validate o **boundary**, trust o **internal**.

## Boundaries (PHAI validate)

1. **User input** — form, URL params, query string, file upload.
2. **External API** — response tu BE, third-party.
3. **Storage** — localStorage, cookie, IndexedDB (user co the sua tay).
4. **Env vars** — env.API_URL co the rong.
5. **fetch() results** — response.ok? response.json() throw?

Cach: zod schema, type guard, runtime check + early return / throw clear message.

## Internal (TRUST, KHONG validate lai)

1. Function nhan data da TS-typed — khong `if (!data) throw`.
2. Provider context da guard trong hook.
3. Function call ngay sau type guard — da narrow.

## Vi du

### Over-defensive (noise)

```tsx
export function MangaCard({ manga }: { manga: Manga }) {
  if (!manga) return null;                    // TS dam bao
  if (!manga.id) return null;                 // type require
  if (typeof manga.title !== "string") ...    // TS guarantee
  try {
    return <article>{manga.title}</article>;
  } catch (e) { return null; }                // khong co gi throw
}
```

### Dung

```tsx
export function MangaCard({ manga }: { manga: Manga }) {
  return <article>{manga.title}</article>
}

async function fetchMangas(): Promise<Manga[]> {
  const res = await fetch('/api/mangas')
  if (!res.ok) throw new Error(`Failed: ${res.status}`)
  return MangaListSchema.parse(await res.json()).items // <- validate O DAY
}
```

## Quy tac mangaka-web

- localStorage read -> dung `~/shared/lib/storage` (da wrap safe).
- localStorage JSON parse -> try/catch + fallback.
- Route loader -> validate params (params.id co the undefined).
- Form submit -> zod o edge (action), khong sprinkle trong component.
- MSW handler -> narrow params.id (string | readonly string[]).

## Try/catch chi khi

- Code thuc su co the throw (network, JSON, storage quota).
- Co handler co nghia: fallback, retry, user message.
- Log error co context: "Failed to load X", e (khong chi `console.error(e)`).

## Anti-pattern

- `catch (e) {}` (swallow loi).
- Validate cung 1 data o 5 layer.
- `if (data) {...}` khi TS dam bao non-null.
- Fallback default cho moi prop optional.
