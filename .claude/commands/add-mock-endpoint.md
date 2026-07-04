---
description: Thêm 1 endpoint mock (MSW + Faker) cho dev khi chưa có swagger
argument-hint: <method> <url-pattern> <factory-name>
---

Thêm endpoint mock mới. Argument: `$ARGUMENTS` (vd `get /api/chapters/:id chapter`).

Đọc `AGENTS.md` §12 + `ARCHITECTURE.md` §6 nếu chưa thuộc workflow MSW + Faker.

## Bước 1 — Tạo / mở factory

File: `app/mocks/factories/<factory-name>.factory.ts`.

Nếu chưa tồn tại, tạo theo template:

```ts
import { faker } from '@faker-js/faker'

export type Xxx = {
  id: string
  // ... fields
}

export function createXxx(overrides: Partial<Xxx> = {}): Xxx {
  return {
    id: faker.string.uuid(),
    // ...
    ...overrides
  }
}

export function createXxxList(count = 10, overrides: Partial<Xxx> = {}): Xxx[] {
  return Array.from({ length: count }, () => createXxx(overrides))
}
```

Hỏi user nếu cần định nghĩa field cụ thể.

## Bước 2 — Tạo / mở handler

File: `app/mocks/handlers/<factory-name>.handler.ts`. Thêm handler MSW theo method + URL:

```ts
import { http, HttpResponse } from "msw";
import { env } from "~/shared/config/env";
import { createXxx } from "../factories/<factory-name>.factory";

const BASE = env.API_URL || "";

export const <factoryName>Handlers = [
  http.<method>(`${BASE}<url-pattern>`, ({ params, request }) => {
    return HttpResponse.json(createXxx());
  }),
];
```

## Bước 3 — Đăng ký vào barrel

Mở `app/mocks/handlers/index.ts`, import handlers mới và spread vào mảng `handlers`.

Mở `app/mocks/factories/index.ts`, export factory mới nếu chưa.

## Bước 4 — Verify

- Restart dev server (MSW worker reload).
- Báo user test bằng: `fetch("<url-pattern>")` từ devtools console.

## Cấm

- KHÔNG sửa file trong `app/api/model/` hay `app/api/operations/` (Orval xoá khi regenerate).
- KHÔNG để type của entity ở 2 nơi — type duy nhất sống trong factory (cho đến khi Orval generate model).
