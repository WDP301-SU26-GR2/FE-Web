---
name: root-cause-analysis
description: Use when debugging a bug, error, unexpected behavior, or test failure. Find the ROOT cause (5 Whys) before patching. Never apply a fix without understanding why the bug exists. Triggers on "bug", "error", "not working", "broken", "fix", "failing", stack traces.
---

# Root Cause Analysis

Khi gặp bug, **KHÔNG patch theo triệu chứng**. Tìm gốc rồi mới fix.

## Quy trình 5 Whys

Hỏi "tại sao?" ít nhất 5 lần đến khi chạm root cause.

**Ví dụ**: theme không persist sau reload.

1. **Why** theme reset về light? → `localStorage.getItem("mangaka-theme")` trả null sau reload.
2. **Why** trả null? → `writeStorage` không được gọi khi user toggle.
3. **Why** không gọi? → useEffect persist phụ thuộc `[hydrated, theme]` nhưng `hydrated` không bao giờ true.
4. **Why** không bao giờ true? → `setHydrated(true)` đặt trong cùng effect với `resolveInitialTheme`, nhưng effect đó throw vì `window.matchMedia` không tồn tại trong SSR run.
5. **Why** SSR run effect đó? → Wait, effect chỉ chạy client-side. Vậy điều gì throw? → kiểm tra console: `STORAGE_KEYS.theme` undefined vì import circular.

→ **Root cause**: import circular, không phải logic theme.
→ **Fix**: refactor import, KHÔNG vá `theme === "dark" ? "dark" : null` (vá triệu chứng).

## Process

### 1. Reproduce

Trước khi sửa: confirm reproduce được. Nếu không reproduce được → hỏi user step cụ thể.

### 2. Read error carefully

- Đọc **toàn bộ** stack trace, không chỉ dòng đầu.
- Note: file path, line, message, expected vs actual.
- Hydration mismatch? → so sánh server HTML và client render đầu.

### 3. Form hypothesis

Đoán nguyên nhân **trước khi đọc code**. Viết ra: "Tui đoán là X vì Y."

### 4. Verify with code/logs

Đọc code/git log/log để confirm hypothesis. Nếu sai → form hypothesis mới, không đoán mò.

### 5. Identify root vs symptom

- **Symptom**: cái user thấy ("nút không click được").
- **Root**: cái thực sự sai ("event handler bind sai context").
- Phân biệt rõ. Fix root, không fix symptom.

### 6. Fix + verify fix doesn't introduce regression

- Sau khi fix, suy nghĩ: thay đổi này có ảnh hưởng path nào khác không?
- Run typecheck + manual test golden path.

## Anti-pattern

- ❌ "Thêm try/catch để khỏi crash" (giấu lỗi, không fix).
- ❌ "Reload page sau lỗi" (workaround triệu chứng).
- ❌ Fix mà không hiểu vì sao bug tồn tại → bug sẽ quay lại ở chỗ khác.
- ❌ Disable test fail thay vì sửa code/test.

## Khi nào "patch nhanh" chấp nhận được

- Hot fix production critical, hứa quay lại fix root sau (kèm TODO + ticket).
- Bug ở dependency bên thứ 3 (không control được). Workaround + báo cáo upstream.

Trong các trường hợp khác: **không có shortcut**.
