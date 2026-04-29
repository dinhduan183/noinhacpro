#!/bin/bash
# Script tự động push code và tạo tag v2.0 lên GitHub
# Double-click file này trong Finder để chạy (hoặc: bash push-v2.0.command)

set -e

cd "$(dirname "$0")"

echo "════════════════════════════════════════════"
echo "  Push v2.0 lên GitHub - Nối Nhạc Pro"
echo "════════════════════════════════════════════"
echo ""

if [ -f .git/index.lock ]; then
  echo "[0/6] Dọn .git/index.lock cũ..."
  rm -f .git/index.lock
fi

echo "[1/6] Trạng thái hiện tại:"
git status --short
echo ""

echo "[2/6] Stage tất cả thay đổi..."
git add -A
echo "✓ Đã stage"
echo ""

if git diff --cached --quiet; then
  echo "[3/6] Không có thay đổi mới để commit."
else
  echo "[3/6] Tạo commit..."
  git commit -m "feat: thêm chức năng ẩn/hiện panel thư mục khỏi tracklist

- Mỗi panel thư mục có nút Eye/EyeOff để bật/tắt
- Khi panel bị ẩn: bài trong panel không hiển thị trong tracklist,
  không tính vào tổng thời gian và không được include khi merge
- Vẫn giữ nguyên panel + danh sách bài (không cần xóa rồi load lại)
- TracklistPanel hiển thị badge mờ với chữ '(ẩn)' cho thư mục đang ẩn
- Tracklist tự cập nhật empty state khi tất cả thư mục bị ẩn

fix(electron): bypass Vite bundler khi require @ffmpeg-installer/ffmpeg
và @ffprobe-installer/ffprobe (dùng biến chuỗi gián tiếp)

chore: thêm public/icon.ico và script 'Mở App.command'"
  echo "✓ Đã commit"
fi
echo ""

echo "[4/6] Push lên origin/main..."
git push origin main
echo "✓ Đã push"
echo ""

echo "[5/6] Tạo tag v2.0..."
if git rev-parse v2.0 >/dev/null 2>&1; then
  echo "⚠ Tag v2.0 đã tồn tại — bỏ qua bước tạo."
else
  git tag -a v2.0 -m "Release v2.0 — Ẩn/hiện panel thư mục

Tính năng mới:
• Bật/tắt từng panel thư mục khỏi tracklist mà không phải xóa
• Nút Eye/EyeOff trên mỗi panel
• Tracklist, tổng thời gian, và file merge tự động loại trừ panel bị ẩn
• Hiển thị trạng thái '(ẩn)' rõ ràng cho thư mục đang tắt

Sửa lỗi:
• Electron build không bundle nhầm ffmpeg/ffprobe installer

Khác:
• Thêm icon.ico cho Windows build
• Thêm script Mở App.command cho macOS"
  echo "✓ Đã tạo tag v2.0"
fi
echo ""

echo "[6/6] Push tag v2.0 lên GitHub..."
git push origin v2.0
echo "✓ Đã push tag"
echo ""

echo "════════════════════════════════════════════"
echo "  ✅ HOÀN TẤT!"
echo "  Tạo GitHub Release từ tag v2.0 tại:"
echo "  https://github.com/dinhduan183/noinhacpro/releases/new?tag=v2.0"
echo "════════════════════════════════════════════"
echo ""
echo "Nhấn phím bất kỳ để đóng cửa sổ..."
read -n 1
