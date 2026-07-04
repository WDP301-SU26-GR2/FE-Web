---
name: condition-based-waiting
description: Use when waiting for an async process, background task, dev server, build to finish, or service to be ready. NEVER use blind `sleep N` to "hope it's done". Poll the actual condition. Triggers when considering `sleep`, "wait for", "until X is ready", checking dev server startup, polling background jobs.
---

# Condition-Based Waiting

**Quy tắc**: đợi **điều kiện thực**, không đợi **thời gian mù**.

## Anti-pattern

```bash
pnpm dev &                  # start dev server background
sleep 5                     # "hope it's ready by now" ❌
curl localhost:5173         # may fail because still booting
```

Vấn đề:

- 5s là **đoán**. Máy chậm → fail. Máy nhanh → phí 4s.
- Không deterministic, gây flaky test/script.
- Khi server thực sự bị treo → script vẫn tiếp tục, sai hoàn toàn.

## Correct pattern

```bash
pnpm dev &
# Poll mỗi 0.5s, max 30s:
for i in {1..60}; do
  if curl -sf http://localhost:5173 > /dev/null; then
    echo "Dev server ready"
    break
  fi
  sleep 0.5
done
```

Hoặc dùng `until` loop (clearer):

```bash
until curl -sf http://localhost:5173 > /dev/null; do
  sleep 0.5
done
```

Hoặc dùng tool sẵn: `wait-on http://localhost:5173`.

## Use cases mangaka-web

### 1. Đợi dev server start

```bash
pnpm dev &
until curl -sf http://localhost:5173 > /dev/null; do sleep 0.3; done
# Bây giờ run e2e / lighthouse / scrape
```

### 2. Đợi MSW worker register (sau pnpm dev)

Mock worker register vào browser bất đồng bộ. E2e wait `window.__MSW_READY__` flag (custom set in entry.client.tsx).

### 3. Đợi build xong

```bash
pnpm build &
BUILD_PID=$!
wait $BUILD_PID                   # đợi đến khi process kết thúc
[ $? -eq 0 ] && echo "Build OK" || echo "Build failed"
```

### 4. Đợi file generated (Orval watch mode)

```bash
pnpm orval:watch &
until [ -f app/api/operations/index.ts ]; do sleep 0.5; done
```

## Quy tắc

1. **Always có timeout** — đừng đợi vô hạn. Set max wait (vd 30s, 5min) → fail clear thay vì treo.
2. **Poll interval ngắn** (0.2s - 1s) cho task nhanh. Dài (5s - 30s) cho task chậm (CI deploy).
3. **Check condition cụ thể** — HTTP 200, file tồn tại, log line match, process exit code.
4. **Log progress** — không silent. `echo "Waiting for X... (attempt N)"`.
5. **Don't poll harness-tracked work** — nếu bạn dùng `run_in_background` của tool harness, harness sẽ notify khi xong. Không cần poll thủ công.

## Khi nào sleep mù OK

- Demo / one-off script không quan trọng.
- Đợi rate limit (sleep 1s giữa request là intentional).
- Animation / UI delay test (đợi 300ms cho transition).
- Tuyệt đối không trong production / CI / automation script.

## Tool harness notes

Khi dùng Claude Code / Codex tool với `run_in_background`:

- Harness tự notify khi process complete.
- KHÔNG sleep + poll trong khi đó — phí token, race condition.
- Chỉ poll khi tracking **external state** harness không thấy (vd CI run remote, deploy queue).
