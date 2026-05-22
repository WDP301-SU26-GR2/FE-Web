import { defineConfig } from 'orval'

/**
 * Orval — codegen từ OpenAPI spec.
 *
 * Cách dùng:
 *   1. Khi BE cung cấp swagger URL / file:
 *      - Sửa `input.target` bên dưới thành URL hoặc path file.
 *   2. Chạy: npm run orval
 *   3. Orval sẽ generate vào:
 *      - app/api/model/        → TypeScript types/interfaces
 *      - app/api/operations/   → fetch functions (dùng trong RR7 loaders / client hooks)
 *      - app/mocks/handlers/generated/  → MSW handlers với Faker data
 *   4. Import generated handlers vào app/mocks/handlers/index.ts,
 *      rồi xoá / comment handler viết tay tương ứng.
 *
 * ⚠️  KHÔNG viết code tay trong app/api/model/ và app/api/operations/
 *     vì `clean: true` sẽ XÓA SẠCH rồi tạo lại mỗi lần chạy orval.
 */
export default defineConfig({
  backendApi: {
    output: {
      mode: 'tags-split', // tách file theo tags trong OpenAPI
      target: 'app/api/operations', // fetch functions
      schemas: 'app/api/model', // TypeScript types
      client: 'fetch', // plain fetch — hoạt động với RR7 loader
      clean: true, // xoá sạch output trước khi generate lại
      indexFiles: true, // tạo barrel index.ts
      mock: {
        type: 'msw',
        indexMockFiles: true,
        useExamples: true // dùng examples từ OpenAPI nếu có
      },
      override: {
        mock: {
          required: true // mock cả optional fields
        },
        useNamedParameters: true, // object params thay vì positional
        mutator: {
          // Custom fetch wrapper — inject base URL, auth headers, v.v.
          // Tạo file này trước khi chạy orval (xem hướng dẫn trong file).
          path: './app/api/mutator/custom-fetch.ts',
          name: 'customFetch'
        }
      }
    },
    input: {
      // ─── Thay bằng URL swagger thực khi BE có ────────────────────────────
      // target: "https://api.mangaka.example.com/swagger/v1/swagger.json",
      // ─── Hoặc dùng file local (download swagger.json từ BE) ─────────────
      // target: "./swagger.json",
      // ─────────────────────────────────────────────────────────────────────
      target: './swagger.json' // placeholder — đổi khi có swagger
    }
  }
})
