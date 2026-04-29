#!/bin/bash
# Script: commit fix icon (256x256) + dời tag v2.0 → trigger lại GitHub Actions build
# Double-click trong Finder để chạy

set -e
cd "$(dirname "$0")"

echo "════════════════════════════════════════════"
echo "  Fix lỗi build Windows: icon.ico < 256x256"
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
  echo "[3] Tạo commit fix icon..."
  git commit -m "fix(build): tạo lại icon.ico multi-size 16/32/48/64/128/256 cho Windows

electron-builder yêu cầu icon Windows tối thiểu 256x256.
icon.ico cũ chỉ 32x32 → build:win fail với:
  ⨯ image public/icon.ico must be at least 256x256

Đã regenerate từ icon.png (512x512) gốc với 6 frame chuẩn,
đảm bảo Windows hiển thị icon sắc nét ở mọi DPI."
  echo "✓ Đã commit"
  NEW_COMMIT=true
fi
echo ""

echo "[4] Push commit lên origin/main..."
git push origin main
echo "✓ Đã push main"
echo ""

if [ "$NEW_COMMIT" = "true" ]; then
  echo "[5] Dời tag v2.0 sang commit mới (đã fix icon)..."

  # Xoá tag cũ cục bộ
  if git rev-parse v2.0 >/dev/null 2>&1; then
    git tag -d v2.0
    echo "  ✓ Đã xoá tag v2.0 cục bộ"
  fi

  # Xoá tag cũ trên remote
  if git ls-remote --tags origin | grep -q "refs/tags/v2.0$"; then
    git push origin :refs/tags/v2.0
    echo "  ✓ Đã xoá tag v2.0 trên GitHub"
  fi

  # Tạo lại tag mới ở HEAD
  git tag -a v2.0 -m "Release v2.0 — Ẩn/hiện panel thư mục

Tính năng mới:
• Bật/tắt từng panel thư mục khỏi tracklist mà không phải xóa
• Nút Eye/EyeOff trên mỗi panel
• Tracklist, tổng thời gian, file merge tự động loại trừ panel bị ẩn
• Hiển thị trạng thái '(ẩn)' rõ ràng cho thư mục đang tắt

Sửa lỗi:
• Electron build không bundle nhầm ffmpeg/ffprobe installer
• Icon Windows được tạo lại đúng kích thước 256x256

CI/CD:
• GitHub Actions tự build .dmg (Mac) + .exe (Windows) khi push tag

Khác:
• Thêm icon.ico cho Windows build
• Thêm script Mở App.command cho macOS"
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
echo "  Khi xong, tải installer tại:"
echo "  https://github.com/dinhduan183/noinhacpro/releases"
echo "════════════════════════════════════════════"
echo ""
echo "Nhấn phím bất kỳ để đóng cửa sổ..."
read -n 1
