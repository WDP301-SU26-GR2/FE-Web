# Prompt: Test-Driven Development

**Note**: mangaka-web CHUA setup Vitest/Playwright. Khi setup, dung prompt nay.

## TDD ap dung cho

### Hop
- Pure function / util (cn, format, slugify)
- Custom hook co logic (useDebounce, useFetch)
- Zod schema / validator
- Reducer / state machine
- API mutator / fetch wrapper

### Khong hop
- UI render thuan (snapshot gay khi doi class)
- CSS / styling
- Integration BE that (dung MSW + e2e)

## Red -> Green -> Refactor

### 1. RED — viet test FAIL truoc
```ts
import { describe, it, expect } from "vitest";
import { cn } from "../cn";

describe("cn", () => {
  it("merges conflicting tailwind classes, later wins", () => {
    expect(cn("p-4 bg-red-500", "p-2")).toBe("bg-red-500 p-2");
  });
});
```
Chay test -> FAIL.

### 2. GREEN — code don gian nhat de pass
Khong over-engineer. Ugly de pass -> ok.

### 3. REFACTOR — clean up, van pass

## Quy tac

1. 1 test, 1 assertion chinh. Khong nhoi 5 expect/test.
2. Ten test mo ta **behavior**, khong implementation: "persists theme across reload" thay vi "calls localStorage.setItem".
3. Test boundary, khong test internal.
4. AAA: Arrange — Act — Assert ro rang.

## Anti-pattern

- Viet test sau khi code pass (mat gia tri catch regression).
- Test implementation detail (`expect(setState).toHaveBeenCalledWith(...)`) — gay khi refactor.
- Mock qua nhieu -> test mock, khong test code that.
- Test trivial (`1+1 === 2`) tang coverage.

## Skip TDD chap nhan duoc

- Exploratory spike / POC -> throw away.
- UI thuan presentation.
- Bug fix co reproduction step -> test sau OK nhung kem hon.

## Setup Vitest (khi user duyet)

Dependencies: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`.
Script: `npm run test`, `test:watch`, `test:coverage`.
Folder: `__tests__/` canh source hoac `<file>.test.ts` cung cap.

KHONG cai cho den khi user duyet (AGENTS.md §13).
