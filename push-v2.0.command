#!/bin/bash
# Script: fix runtime crash + dời tag v2.0 → trigger build lại
# Double-click trong Finder để chạy

set -e
cd "$(dirname "$0")"

echo "════════════════════════════════════════════"
echo "  Fix lỗi 'undefined: undefined' khi mở app"
echo "  → commit + re-tag v2.0 để build lại"
echo "════════════════════════════════════════════"
echo ""

if [ -f .git/index.lock ]; then
  echo "[0] Dọn .git/index.lock cũ..."
  rm -f .git/index.lock
fi

echo "[1] Trạng thái hiện tại:"
git status --short
echo ""

echo "[2] Stage thay đổi..."
git add -A
echo "✓ Đã stage"
echo ""

if git diff --cached --quiet; then
  echo "[3] Không có thay đổi mới — bỏ qua commit."
  NEW_COMMIT=false
else
  echo "[3] Tạo commit fix runtime crash..."
  git commit -m "fix(electron): app crash 'undefined: undefined' ngay sau khi cài

Nguyên nhân:
Vite/rolldown đã bundle nguyên @ffmpeg-installer/ffmpeg index.js
vào main.js. Bên trong package này có code dùng __dirname để xác
định path tới sub-package platform-specific (@ffmpeg-installer/win32-x64,
@ffmpeg-installer/darwin-arm64). Khi bị bundle, __dirname trỏ vào
main.js (sai vị trí) → các path lookup đều fail → package throw một
chuỗi string (không phải Error object) → Electron dialog hiển thị
'undefined: undefined' vì string không có name/message property.

Sửa:
1. vite.config.ts: thêm rollupOptions.external cho fluent-ffmpeg,
   @ffmpeg-installer/*, @ffprobe-installer/* — để các package này
   được require ở runtime với __dirname đúng vị trí trong node_modules.

2. package.json:
   - Thêm asarUnpack cho 3 package trên (binary cần nằm ngoài asar
     để có thể spawn được).
   - Thêm node_modules/**/* và package.json vào files (cần thiết khi
     external + asarUnpack).
   - Bỏ bin/**/* khỏi files (không dùng đến, tiết kiệm 158MB build).

3. electron/main.ts:
   - Thêm process.on('uncaughtException') + 'unhandledRejection' bắt
     mọi lỗi sớm và ghi log vào userData/main-error.log.
   - Wrap setup ffmpeg/ffprobe trong try-catch — không crash app nếu
     setup fail, chỉ log lỗi.
   - Validate result từ require() trước khi access .path.
   - Dialog.showErrorBox khi có uncaughtException — hiển thị message
     thật thay vì 'undefined: undefined'."
  echo "✓ Đã commit"
  NEW_COMMIT=true
fi
echo ""

echo "[4] Push commit lên origin/main..."
git push origin main
echo "✓ Đã push main"
echo ""

if [ "$NEW_COMMIT" = "true" ]; then
  echo "[5] Dời tag v2.0 sang commit mới (đã fix runtime crash)..."

  if git rev-parse v2.0 >/dev/null 2>&1; then
    git tag -d v2.0
    echo "  ✓ Đã xoá tag v2.0 cục bộ"
  fi

  if git ls-remote --tags origin | grep -q "refs/tags/v2.0$"; then
    git push origin :refs/tags/v2.0
    echo "  ✓ Đã xoá tag v2.0 trên GitHub"
  fi

  git tag -a v2.0 -m "Release v2.0 — Ẩn/hiện panel thư mục

Tính năng mới:
• Bật/tắt từng panel thư mục khỏi tracklist mà không phải xóa
• Nút Eye/EyeOff trên mỗi panel
• Tracklist, tổng thời gian, file merge tự động loại trừ panel bị ẩn

Sửa lỗi:
• Electron build không bundle nhầm ffmpeg/ffprobe installer
• Icon Windows được tạo lại đúng kích thước 256x256
• Fix crash 'undefined: undefined' ngay sau khi cài app

CI/CD:
• GitHub Actions tự build .dmg (Mac) + .exe (Windows) khi push tag"
  echo "  ✓ Đã tạo lại tag v2.0"

  git push origin v2.0
  echo "  ✓ Đã push tag v2.0 → workflow đang chạy lại"
else
  echo "[5] Không có commit mới → giữ nguyên tag v2.0"
fi
echo ""

echo "════════════════════════════════════════════"
echo "  ✅ HOÀN TẤT!"
echo ""
echo "  Theo dõi build (mất ~10-15 phút):"
echo "  https://github.com/dinhduan183/noinhacpro/actions"
echo ""
echo "  Khi xong, cài lại app từ Release v2.0:"
echo "  https://github.com/dinhduan183/noinhacpro/releases"
echo ""
echo "  Nếu vẫn còn lỗi sau khi cài lại, log đầy đủ"
echo "  được ghi tại userData/main-error.log:"
echo "    Mac: ~/Library/Application Support/Noi Nhac Pro/"
echo "    Win: %APPDATA%/Noi Nhac Pro/"
echo "════════════════════════════════════════════"
echo ""
echo "Nhấn phím bất kỳ để đóng cửa sổ..."
read -n 1
