# Đồng bộ thuật ngữ tiếng Việt cho Mangaka

## Mục tiêu

Đồng bộ mọi văn bản giao diện tiếng Việt thuộc role Mangaka để dùng hai thuật
ngữ nghiệp vụ thống nhất:

- `series` hiển thị là **loạt truyện**.
- `studio` hiển thị là **xưởng vẽ**.

## Phạm vi

- Rà toàn bộ namespace `mangaka` trong `app/locales/vi/mangaka.json` và các
  literal hiển thị trong `app/features/mangaka`, route/layout và shared UI mà
  Mangaka dùng.
- Cập nhật nhãn menu, tiêu đề, mô tả, nút, trạng thái rỗng, form, dialog và
  thông báo để không còn cách gọi tiếng Anh `series` hoặc `studio` cho hai
  khái niệm này.
- Giữ nguyên bản dịch tiếng Anh, key i18n, enum, tên biến/thư mục, route và API
  để không làm thay đổi hợp đồng kỹ thuật.

## Cách thực hiện và xác minh

1. Tìm các chuỗi hiển thị chứa `series` hoặc `studio` trong bề mặt Mangaka.
2. Sửa bản dịch tiếng Việt theo ngữ cảnh số ít/số nhiều nhưng luôn dùng hai
   thuật ngữ chuẩn.
3. Quét lại các source/bản dịch Mangaka, chạy typecheck, lint và kiểm tra format
   đối với các file đã đổi.

## Ngoài phạm vi

- Đổi enum/API hoặc cấu trúc feature.
- Đổi thuật ngữ cho role Assistant hay các role khác.
