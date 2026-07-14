import type { RequestHandler } from 'msw'

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
 *   1. Import generated handlers từ `~/api/operations/index.msw` vào đây.
 *   2. Xoá / comment handler viết tay tương ứng.
 */

// Handler viết tay (placeholder — xoá khi orval generate được)
import { exampleHandlers } from './example.handler'

// Orval generated handlers — mỗi hàm trả về array of MSW handlers
import {
  getAuthMock,
  getSeriesMock,
  getNamesMock,
  getReviewsMock,
  getUploadsMock,
  getUsersMock,
} from '~/api/operations/index.msw'

export const handlers: RequestHandler[] = [
  // Orval generated (bật khi VITE_ENABLE_MOCK=true)
  ...getAuthMock(),
  ...getSeriesMock(),
  ...getNamesMock(),
  ...getReviewsMock(),
  ...getUploadsMock(),
  ...getUsersMock(),
  // Handler viết tay — xoá dòng dưới khi orval chạy xong
  ...exampleHandlers,
]
