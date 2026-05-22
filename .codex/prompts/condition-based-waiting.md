# Prompt: Condition-Based Waiting

Doi **dieu kien thuc**, khong doi **thoi gian mu**.

## Anti-pattern

```bash
pnpm dev &
sleep 5                     # "hope ready" -> may cham fail, may nhanh phi 4s
curl localhost:5173         # may fail
```

## Correct

```bash
pnpm dev &
until curl -sf http://localhost:5173 > /dev/null; do sleep 0.3; done
```

Hoac: `wait-on http://localhost:5173`.

## Use cases mangaka-web

1. **Doi dev server start**:
   ```bash
   pnpm dev &
   until curl -sf http://localhost:5173 > /dev/null; do sleep 0.3; done
   ```

2. **Doi build xong**:
   ```bash
   pnpm build & BUILD_PID=$!
   wait $BUILD_PID
   [ $? -eq 0 ] && echo "Build OK" || echo "Build failed"
   ```

3. **Doi file generated (Orval watch)**:
   ```bash
   pnpm orval:watch &
   until [ -f app/api/operations/index.ts ]; do sleep 0.5; done
   ```

## Quy tac

1. **Always co timeout** — khong doi vo han.
2. **Poll interval ngan** (0.2-1s) cho task nhanh, dai (5-30s) cho CI.
3. **Check condition cu the** — HTTP 200, file ton tai, log match, exit code.
4. **Log progress** — `echo "Waiting for X..."`.
5. **Don't poll harness-tracked work** — neu dung `run_in_background`, harness tu notify.

## Khi sleep mu OK

- Demo / one-off khong quan trong.
- Rate limit (intentional).
- UI animation delay test.
- Tuyet doi khong trong production / CI / automation.
