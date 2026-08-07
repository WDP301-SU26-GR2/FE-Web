# Khóa thao tác page sau khi xác nhận output

## Mục tiêu

Sau khi Mangaka xác nhận thành công toàn bộ output của production stage hiện tại, các thao tác thêm page và xóa từng page phải bị disable trong flow xuất bản chapter.

## Nguyên nhân hiện tại

`ProductionStagePanel` đã tính `outputsLocked` khi mọi page của stage active có `outputReady`, nhưng callback `onPageSetLockChange` chỉ nhận `pageSetLocked`, vốn chỉ phản ánh stage đã chuyển khỏi trạng thái `ACTIVE`. Vì vậy stage vẫn `ACTIVE` ngay sau khi xác nhận output nên page set vẫn mở.

## Thiết kế

- Gộp hai điều kiện khóa thành một điều kiện: page set bị khóa nếu không còn stage `ACTIVE` hoặc output của stage hiện tại đã được xác nhận đầy đủ.
- Khi chuyển sang stage kế tiếp đang `ACTIVE`, page set mở lại để Mangaka tiếp tục thêm/xóa page cho stage mới.
- Chỉ cập nhật khóa từ luồng refresh sau khi API xác nhận thành công; không thêm trạng thái lỗi hay thay đổi API.
- Giữ nguyên các thao tác hiện có và trạng thái `hold`; chỉ thay đổi nguồn quyết định `pageSetLocked` truyền xuống page reader.
- Tách điều kiện thành helper thuần để có test hồi quy độc lập với React rendering.

## Kiểm thử

- Kiểm tra stage vẫn `ACTIVE` nhưng `outputsLocked = true` thì page set bị khóa.
- Kiểm tra stage `ACTIVE` và output chưa khóa thì page set vẫn mở.
- Kiểm tra không còn stage `ACTIVE` vẫn bị khóa dù output flag là false.
