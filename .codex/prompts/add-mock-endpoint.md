# Prompt: Add Mock Endpoint

Them 1 endpoint mock (MSW + Faker) cho dev khi chua co swagger.

## Input

`<method> <url-pattern> <factory-name>` (vd `get /api/chapters/:id chapter`).

Doc `AGENTS.md` §12 + `ARCHITECTURE.md` §6 neu chua thuoc workflow.

## Steps

### 1. Tao / mo factory

File: `app/mocks/factories/<factory-name>.factory.ts`.

Template:

```ts
import { faker } from "@faker-js/faker";

export type Xxx = {
  id: string;
  // ... fields
};

export function createXxx(overrides: Partial<Xxx> = {}): Xxx {
  return {
    id: faker.string.uuid(),
    // ...
    ...overrides,
  };
}

export function createXxxList(count = 10, overrides: Partial<Xxx> = {}): Xxx[] {
  return Array.from({ length: count }, () => createXxx(overrides));
}
```

Hoi user neu can dinh nghia field cu the.

### 2. Tao / mo handler

File: `app/mocks/handlers/<factory-name>.handler.ts`:

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

### 3. Dang ky vao barrel

- `app/mocks/handlers/index.ts`: import handlers + spread vao mang `handlers`.
- `app/mocks/factories/index.ts`: export factory neu chua.

### 4. Verify

- Restart dev server (MSW worker reload).
- Test: `fetch("<url-pattern>")` tu devtools console.

## Cam

- KHONG sua `app/api/model/` hay `app/api/operations/` (Orval xoa khi regenerate).
- KHONG type entity o 2 noi — type duy nhat trong factory (cho den khi Orval generate model).
