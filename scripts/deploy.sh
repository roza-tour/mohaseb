#!/bin/bash
# نشر التحديثات على الاستضافة (cPanel) — خطوة واحدة.
# يثبّت الحزم، يطبّق تعديلات قاعدة البيانات، يبني التطبيق، يفعّل المهام التلقائية، ويعيد التشغيل.
#
#   cd ~/mohaseb-app && git pull && bash scripts/deploy.sh

set -e

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

# تفعيل بيئة node الخاصة بـ cPanel إن لم تكن مفعّلة
if ! command -v npm >/dev/null 2>&1; then
  ACTIVATE="$(ls -d "$HOME"/nodevenv/mohaseb-app/*/bin/activate 2>/dev/null | head -n1 || true)"
  if [ -n "$ACTIVATE" ]; then
    echo "▶ تفعيل بيئة node ..."
    # shellcheck disable=SC1090
    source "$ACTIVATE"
  else
    echo "❌ لم أجد npm ولا بيئة node. فعّلها يدوياً:"
    echo "   source ~/nodevenv/mohaseb-app/*/bin/activate"
    exit 1
  fi
fi

echo "▶ 1/5 تثبيت الحزم ..."
npm install --include=dev

echo "▶ 2/5 تحديث قاعدة البيانات ..."
npm run db:deploy
npx tsx prisma/add-programs.ts

echo "▶ 3/5 بناء التطبيق ..."
npm run build

echo "▶ 4/5 تفعيل المهام التلقائية ..."
bash scripts/setup-cron.sh

echo "▶ 5/5 إعادة التشغيل ..."
mkdir -p tmp && touch tmp/restart.txt

echo
echo "🎉 تم النشر بنجاح — التطبيق محدَّث وشغّال."
