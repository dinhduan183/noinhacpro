#!/bin/bash
# Script: commit GitHub Actions workflow + dời tag v2.0 sang commit mới
# Sau khi push, GitHub Actions sẽ tự build .dmg + .exe và tạo Release
# Double-click trong Finder để chạy

set -e
cd "$(dirname "$0")"

echo "════════════════════════════════════════════"
echo "  Bổ sung CI/CD và re-tag v2.0"
echo "  Để GitHub Actions tự build .exe + .dmg"
echo "════════════════════════════════════════════"
echo ""

if [ -f .git/index.lock ]; then
  echo "[0] Dọn .git/index.lock cũ..."
  rm -f .git/index.lock
fi

echo "[1] Trạng thái hiện tại:"
git status --short
echo ""

echo "[2] Stage thay đổi (workflow + script update)..."
git add -A
echo "✓ Đã stage"
echo ""

if git diff --cached --quiet; then
  echo "[3] Không có thay đổi mới — bỏ qua commit."
  NEW_COMMIT=false
else
  echo "[3] Tạo commit cho CI/CD..."
  git commit -m "ci: thêm GitHub Actions tự build .dmg (Mac) và .exe (Windows) khi push tag v*

Workflow tại .github/workflows/build-release.yml:
- Trigger trên push tag bắt đầu bằng 'v' (v2.0, v2.1, v3.0...)
- Build song song trên macos-latest và windows-latest
- Tự upload installer vào GitHub Release tương ứng
- Có thể chạy thủ công qua workflow_dispatch"
  echo "✓ Đã commit"
  NEW_COMMIT=true
fi
echo ""

echo "[4] Push commit lên origin/main..."
git push origin main
echo "✓ Đã push main"
echo ""

# Chỉ re-tag nếu có commit mới
if [ "$NEW_COMMIT" = "true" ]; then
  echo "[5] Dời tag v2.0 sang commit mới (có workflow)..."

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

  # Tạo lại tag mới ở HEAD (commit mới có workflow)
  git tag -a v2.0 -m "Release v2.0 — Ẩn/hiện panel thư mục

Tính năng mới:
• Bật/tắt từng panel thư mục khỏi tracklist mà không phải xóa
• Nút Eye/EyeOff trên mỗi panel
• Tracklist, tổng thời gian, file merge tự động loại trừ panel bị ẩn
• Hiển thị trạng thái '(ẩn)' rõ ràng cho thư mục đang tắt

Sửa lỗi:
• Electron build không bundle nhầm ffmpeg/ffprobe installer

CI/CD:
• GitHub Actions tự build .dmg (Mac) + .exe (Windows) khi push tag

Khác:
• Thêm icon.ico cho Windows build
• Thêm script Mở App.command cho macOS"
  echo "  ✓ Đã tạo lại tag v2.0"

  # Push tag lên — sẽ TRIGGER workflow
  git push origin v2.0
  echo "  ✓ Đã push tag v2.0 (workflow đang chạy)"
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
echo "  Khi build xong, tải installer tại:"
echo "  https://github.com/dinhduan183/noinhacpro/releases"
echo "════════════════════════════════════════════"
echo ""
echo "Nhấn phím bất kỳ để đóng cửa sổ..."
read -n 1
