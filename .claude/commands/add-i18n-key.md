---
description: Thêm 1 i18n key vào cả EN và VI, đảm bảo parity
argument-hint: <namespace>.<key.path> "EN value" "VI value"
---

Thêm key i18n mới. Input dạng: `$ARGUMENTS`.

## Yêu cầu

1. Parse argument theo format `<namespace>.<key.path> "EN value" "VI value"`.
   - Vd: `welcome.subtitle "Welcome subtitle" "Phụ đề chào mừng"`
   - `key.path` có thể nested (vd `errors.notFound`).
2. Mở `app/locales/en/<namespace>.json` và `app/locales/vi/<namespace>.json`.
3. Nếu namespace **chưa tồn tại** → STOP, báo user dùng `/new-feature` hoặc tự tạo namespace trước (cần đăng ký vào `app/shared/lib/i18n/resources.ts`).
4. Thêm key vào **CẢ HAI** file. Nếu key đã tồn tại ở 1 trong 2 → báo conflict, hỏi user trước khi ghi đè.
5. Giữ JSON valid (trailing comma, indent 2 spaces giống file gốc).

## Verify

Sau khi thêm:

- Đọc lại 2 file để xác nhận parity (cùng tập key).
- Báo: "Đã thêm `<namespace>:<key.path>` vào EN/VI."

## Cấm

- Không nhúng HTML thô vào value. Nếu cần markup, gợi ý user dùng `<Trans>` component.
- Không ghép chuỗi trong code — value dùng interpolation `{{name}}` khi cần.
