#!/usr/bin/env bash
# Deploy แอป Rattana จาก D:\App ขึ้น GitHub Pages (rattanaphaiboon/app · main)
#
# วิธีใช้
#   bash deploy.sh                  → อัปทุกไฟล์ในรายการ APPS ที่มีการแก้ไข
#   bash deploy.sh supply-lite      → อัปเฉพาะไฟล์ที่ระบุ (พิมพ์ชื่อสั้น ๆ ได้ ไม่ต้องใส่ .html)
#   bash deploy.sh --dry            → ดูว่าจะอัปอะไรบ้าง แต่ยังไม่ commit/push
#
# push แล้ว GitHub Actions (.github/workflows/deploy-pages.yml) จะ deploy ให้เอง
# รอประมาณ 1-2 นาที เว็บถึงจะอัปเดต
set -e

SRC_DIR="D:/App"
DEPLOY="/c/Users/hp/rattana-voice-deploy"
PAGES_URL="https://rattanaphaiboon.github.io/app"

# ⬇️ เพิ่มแอปใหม่ตรงนี้
APPS=(
  rattana-voice.html
  rattana-supply-lite.html
  rattana-scorecard.html
  rattana-pc-checkin.html
  rattana-pc-checkin-guide.html
  rattana-empid.html
  rattana-repair-doc.html
  rattana-pc-checkin.webmanifest
  rattana-pc-checkin-sw.js
  pc-icon-192.png
  pc-icon-512.png
  pc-icon-mask.png
  pc-icon-180.png
)

DRY=0
PICK=()
for a in "$@"; do
  case "$a" in
    --dry) DRY=1 ;;
    *)
      # พิมพ์ชื่อย่อได้ เช่น "supply-lite" → หาไฟล์ในลิสต์ APPS ที่ชื่อมีคำนี้อยู่
      hit=""
      for f in "${APPS[@]}"; do
        case "$f" in *"${a%.html}"*) hit="$f"; break ;; esac
      done
      PICK+=("${hit:-${a%.html}.html}")
      ;;
  esac
done
[ ${#PICK[@]} -gt 0 ] && APPS=("${PICK[@]}")

cd "$DEPLOY"

# ดึงของล่าสุดจาก remote ก่อน กัน push ไม่ผ่านเพราะตามหลังอยู่
git pull --quiet --no-edit origin main || true

CHANGED=()
for f in "${APPS[@]}"; do
  if [ ! -f "$SRC_DIR/$f" ]; then
    echo "ข้าม            $f — ไม่พบไฟล์ใน $SRC_DIR"
    continue
  fi
  cp "$SRC_DIR/$f" "$DEPLOY/$f"

  # ไฟล์ใหม่ที่ git ยังไม่รู้จัก = ต้องอัปแน่นอน
  if git ls-files --error-unmatch "$f" >/dev/null 2>&1; then
    if git diff --quiet -- "$f"; then
      echo "ไม่มีอะไรเปลี่ยน $f"
      continue
    fi
  fi

  VER=$(grep -aoE 'v[0-9]+\.[0-9]+' "$f" | head -1 || true)
  CHANGED+=("$f")
  echo "พร้อมอัป        $f  ${VER:-(ไม่พบเลขเวอร์ชัน)}"
done

if [ ${#CHANGED[@]} -eq 0 ]; then
  echo "ไม่มีไฟล์ที่ต้องอัป"
  exit 0
fi

if [ "$DRY" = "1" ]; then
  echo
  echo "โหมด --dry: หยุดแค่นี้ ยังไม่ได้ commit/push"
  exit 0
fi

git add "${CHANGED[@]}"

MSG="Update $(printf '%s ' "${CHANGED[@]}" | sed 's/ $//')"
for f in "${CHANGED[@]}"; do
  VER=$(grep -aoE 'v[0-9]+\.[0-9]+' "$f" | head -1 || true)
  [ -n "$VER" ] && MSG="$MSG"$'\n'"- $f $VER"
done

git commit -q -F - <<EOF
$MSG

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF

git push --quiet origin main

echo
echo "push เรียบร้อย → github.com/rattanaphaiboon/app (main)"
for f in "${CHANGED[@]}"; do echo "  $PAGES_URL/$f"; done
echo "GitHub Actions กำลัง deploy — รอ 1-2 นาทีแล้วกด refresh"
