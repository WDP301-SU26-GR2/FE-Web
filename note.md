# Khi BE update swagger

npm run orval:fetch # download swagger.json mới nhất từ BE
npm run orval # generate types + fetch functions từ file local

# Hoặc gộp 1 lệnh

npm run orval:fetch && npm run orval

# Type chưa được generate:

npm run typecheck

# hoặc chạy riêng:

npx react-router typegen

ADMIN_PASSWORD='admin@123123'
ADMIN_EMAIL='admin@ecom.dev.com'
