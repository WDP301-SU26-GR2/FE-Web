import type { RequestHandler } from "msw";

/**
 * Tổng hợp TẤT CẢ mock handlers.
 *
 * Cấu trúc:
 *   - mocks/handlers/           ← folder này (handler viết tay)
 *   │   ├── index.ts            ← barrel (file này)
 *   │   └── example.handler.ts  ← handler viết tay (placeholder trước khi có swagger)
 *   - api/operations/**\/*.msw.ts ← handler do `npm run orval` generate (KHÔNG viết tay)
 *
 * Khi Orval đã chạy được:
 *   1. Import generated handlers từ `~/api/operations/<tag>/<tag>.msw` vào đây.
 *   2. Xoá / comment handler viết tay tương ứng.
 */

// Handler viết tay (placeholder — xoá khi orval generate được)
import { exampleHandlers } from "./example.handler";

// ─── Orval generated handlers (uncomment khi có swagger) ──────────────────────
// import { getMangasHandlers } from "~/api/operations/manga-endpoints/manga-endpoints.msw";
// import { getUsersHandlers } from "~/api/operations/user-endpoints/user-endpoints.msw";
// ─────────────────────────────────────────────────────────────────────────────

export const handlers: RequestHandler[] = [
  ...exampleHandlers,

  // ...getMangasHandlers(),
  // ...getUsersHandlers(),
];
