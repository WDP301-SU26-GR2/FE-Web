import { defineConfig } from 'orval'

// Orval config - generate types and fetch functions from OpenAPI spec.
//
// Run: npm run orval
// Output:
//   - app/api/model/<tag>/          -> TypeScript types, split by tag (auth, series, ...)
//   - app/api/operations/<tag>/     -> fetch functions, split by tag
//   - app/api/operations/<tag>/<tag>.msw.ts -> MSW mock handlers
//   - app/api/model/index.ts        -> barrel over per-tag sub-folders
//
// Hooks (run in order after each generation):
//   1. fix-generated-types.mjs        -> adds @ts-ignore to suppress HeadersInit strict error
//   2. organize-models-by-tag.mjs     -> splits flat model/ into per-tag sub-folders
//   3. recreate-operations-index.mjs  -> recreates operations barrel after Orval wipes it
//
// IMPORTANT: Do NOT edit app/api/model/ or app/api/operations/ manually.
// clean: true wipes them on every run. Only edit app/api/mutator/custom-fetch.ts.
export default defineConfig({
  backendApi: {
    output: {
      mode: 'tags-split',
      target: 'app/api/operations',
      schemas: 'app/api/model',
      client: 'fetch',
      clean: true,
      indexFiles: true,
      mock: {
        type: 'msw',
        indexMockFiles: true,
        useExamples: true,
      },
      override: {
        mutator: {
          path: './app/api/mutator/custom-fetch.ts',
          name: 'customFetch',
        },
        mock: {
          required: true,
        },
        useNamedParameters: true,
      },
    },
    input: {
      // ─── Dùng swagger local (cache từ BE) ────────────────────────────────
      // Ưu tiên local để orval chạy ổn định, không phụ thuộc mạng.
      // Khi BE update swagger, chạy: npm run orval:fetch
      // (script sẽ download về swagger.json rồi orval tự generate).
      target: './swagger.json'
    },
    hooks: {
      afterAllFilesWrite: [
        // Run FIRST so files exist at their final locations before being
        // moved into per-tag sub-folders by the next hook.
        {
          command: 'node scripts/fix-generated-types.mjs',
        },
        // Organize flat model/ into per-tag sub-folders (e.g. model/auth/).
        {
          command: 'node scripts/organize-models-by-tag.mjs',
        },
        // Recreate operations barrel after Orval wipes it.
        {
          command: 'node scripts/recreate-operations-index.mjs',
        },
      ],
    },
  },
})
