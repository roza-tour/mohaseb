#!/bin/bash
# نشر التحديثات على الاستضافة (cPanel) — خطوة واحدة.
# يأخذ نسخة احتياطية، ويثبّت الحزم، ويطبّق تعديلات قاعدة البيانات، ويبني التطبيق،
# ويفعّل المهام التلقائية، ويعيد التشغيل، ثم يفحص أن الموقع يعمل فعلاً.
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

echo "▶ 1/6 نسخة احتياطية قبل أي تعديل على قاعدة البيانات ..."
# لو فشلت (mysqldump غير متاح مثلاً) لا نوقف النشر، لكن ننبّه بوضوح
if node scripts/backup.mjs; then
  echo "   ✓ النسخة الاحتياطية في ~/mohaseb-backups"
else
  echo "   ⚠️  تعذّر أخذ نسخة احتياطية — تابعنا النشر. خذ نسخة من phpMyAdmin ← Export إن أمكن."
fi

echo "▶ 2/6 تثبيت الحزم ..."
npm install --include=dev

echo "▶ 3/6 تحديث قاعدة البيانات ..."
npm run db:deploy
npx tsx prisma/add-programs.ts

echo "▶ 4/6 بناء التطبيق ..."
npm run build

echo "▶ 5/6 تفعيل المهام التلقائية ..."
bash scripts/setup-cron.sh

echo "▶ 6/6 إعادة التشغيل ..."
mkdir -p tmp && touch tmp/restart.txt

# فحص سريع أن الموقع يعمل بعد النشر (لا يُفشل النشر إن تعذّر)
APP_URL="$(sed -n 's/^[[:space:]]*APP_URL[[:space:]]*=[[:space:]]*//p' .env | head -n1 | sed 's/^["'"'"']//; s/["'"'"']$//; s|/$||')"
if [ -n "$APP_URL" ]; then
  echo
  echo "▶ فحص سريع بعد النشر ($APP_URL) ..."
  # Passenger يبدأ التطبيق عند أول طلب — ننتظر إقلاعه قبل الفحص
  for i in 1 2 3 4 5 6; do
    curl -fsS -m 30 "$APP_URL/login" >/dev/null 2>&1 && break
    sleep 5
  done
  set +e
  if [ -n "${SMOKE_PASSWORD:-}" ]; then
    node scripts/smoke-test.mjs "$APP_URL"
  else
    # بلا تسجيل دخول: لا نريد أن تُحتسب محاولة فاشلة على حساب المدير.
    # لفحص الصفحات الداخلية أيضاً:  SMOKE_EMAIL=... SMOKE_PASSWORD=... bash scripts/deploy.sh
    node scripts/smoke-test.mjs "$APP_URL" --public
  fi
  SMOKE=$?
  set -e
  if [ "$SMOKE" != "0" ]; then
    echo "⚠️  بعض الفحوصات فشلت — راجع القائمة أعلاه و stderr.log."
  fi
fi

echo
echo "🎉 تم النشر — التطبيق محدَّث وشغّال."
echo "   التنظيف التلقائي للجداول يبقى معطَّلاً حتى تفعّله من: الإعدادات ← التنظيف التلقائي."
