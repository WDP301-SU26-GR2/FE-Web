# Prompt: Debugging Hydration Mismatch

mangaka-web chay SSR mac dinh. Hydration mismatch xay ra khi server render != client render lan dau.

## Common causes (mangaka-web)

1. **localStorage/window in render** — server khong co. Boc trong useEffect hoac dung ~/shared/lib/storage.
2. **Time-dependent** — `new Date()`, `Math.random()` -> server time != client. Render placeholder, update trong effect.
3. **prefers-color-scheme** — server khong biet. Repo dung themeInitScript inject vao <head> truoc hydrate.
4. **i18n language detect** — server fallback "vi", client doi trong effect. Lan render dau accept "vi", neu can chinh xac thi luu language vao cookie + doc trong loader.
5. **typeof window check render** — `{typeof window !== "undefined" && <X />}` -> mismatch. Dung mounted state pattern.
6. **Invalid HTML** — `<p><div></div></p>` -> browser auto-fix -> DOM != HTML.

## Workflow

1. Doc warning React 19 — chi ro cay mismatch.
2. Disable JS trong DevTools -> reload -> xem HTML server. So voi client.
3. Identify branch render khac (time/random/window/storage).
4. Move logic gay khac biet vao useEffect, render placeholder.
5. Verify: reload nhieu lan, khong thay warning.

## Anti-pattern

- KHONG suppressHydrationWarning lung tung.
- KHONG `if (typeof window === "undefined") return null` toan component.
- KHONG disable SSR de ne.
