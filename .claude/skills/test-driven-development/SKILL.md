---
name: test-driven-development
description: Use when adding new logic that has clear input/output (utilities, hooks, business logic, validators). Write the failing test FIRST, then implement. Skip TDD for pure UI rendering. Triggers when user says "add function X", "implement validator", "create hook".
---

# Test-Driven Development

**Lưu ý**: mangaka-web **chưa setup Vitest / Playwright** (xem AGENTS.md §13). Khi setup, dùng skill này.

## TDD áp dụng cho cái gì

### ✅ Hợp với TDD

- Pure function / util (`cn()`, format date, slugify).
- Custom hook có logic (`useDebounce`, `useFetch`).
- Zod schema / validator.
- Reducer / state machine.
- API mutator / fetch wrapper logic.

### ❌ Không hợp TDD

- UI render thuần (snapshot test có giá trị thấp, gãy mỗi lần đổi className).
- CSS / styling.
- Integration với BE thật (dùng MSW + e2e thay vì unit).

## Red → Green → Refactor

### 1. RED — viết test FAIL trước

```ts
// app/shared/lib/__tests__/cn.test.ts
import { describe, it, expect } from "vitest";
import { cn } from "../cn";

describe("cn", () => {
  it("merges conflicting tailwind classes, later wins", () => {
    expect(cn("p-4 bg-red-500", "p-2")).toBe("bg-red-500 p-2");
  });
  
  it("handles falsy values", () => {
    expect(cn("p-4", false, null, undefined, "m-2")).toBe("p-4 m-2");
  });
});
```

Chạy test → **FAIL** (chưa implement hoặc impl chưa đúng).

### 2. GREEN — code đơn giản nhất để pass

Không over-engineer. Code "ugly" để pass test → ok ở bước này.

### 3. REFACTOR — clean up, vẫn pass

Đổi structure, đặt tên lại, tách function. Test phải vẫn pass.

## Quy tắc

1. **1 test, 1 assertion chính** (không nhồi 5 expect vào 1 test).
2. Tên test mô tả **behavior**, không phải implementation: `"persists theme across reload"` chứ không phải `"calls localStorage.setItem"`.
3. **Test boundary** không test internal: test public API của module, không test private function.
4. **AAA pattern**: Arrange — Act — Assert. Mỗi block rõ ràng.

## Anti-pattern

- ❌ Viết test sau khi code đã pass (test mất giá trị catch regression vì không biết nó từng fail).
- ❌ Test implementation detail (`expect(setState).toHaveBeenCalledWith(...)`) — gãy khi refactor.
- ❌ Mock quá nhiều → test chỉ test mock, không test code thật.
- ❌ Test trivial (`expect(1+1).toBe(2)`) chỉ để tăng coverage.

## Khi nào skip TDD chấp nhận được

- Exploratory spike (POC, prototype) — biết sẽ throw away.
- UI component thuần presentation.
- Bug fix với reproduction step rõ ràng → có thể test sau khi fix (acceptable nhưng kém hơn TDD).

## Khi setup Vitest

Đề xuất với user khi cần:
- `vitest` + `@testing-library/react` + `@testing-library/jest-dom` + `jsdom`.
- Folder convention: `__tests__/` cạnh source, hoặc `<file>.test.ts` cùng cấp.
- Script `npm run test`, `test:watch`, `test:coverage`.
- KHÔNG cài cho đến khi user duyệt (xem AGENTS.md "đề xuất rõ trong phản hồi và chờ confirm").
