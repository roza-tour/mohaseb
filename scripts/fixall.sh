#!/bin/bash
# أمر واحد يعمل كل شيء على الاستضافة:
# تحديث → نسخة احتياطية → تثبيت → هجرة قاعدة البيانات → بناء → مهام تلقائية →
# إعادة تشغيل → تشخيص → إصلاح السجلات التالفة → فحص نهائي.
#
#   cd ~/mohaseb-app && git pull && bash scripts/fixall.sh
#
# لا يتوقف عند أول خطأ — ينفّذ كل الخطوات ويطبع في النهاية ما نجح وما فشل.

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR" || exit 1

# نحفظ كل ما يُطبع في ملف، حتى يمكن إرساله كاملاً بدل نسخه من الشاشة.
if [ -z "${MOHASEB_FIXALL_LOG:-}" ]; then
  mkdir -p "$APP_DIR/tmp"
  export MOHASEB_FIXALL_LOG="$APP_DIR/tmp/fixall-$(date +%Y%m%d-%H%M%S).log"
  bash "$APP_DIR/scripts/fixall.sh" "$@" 2>&1 | tee "$MOHASEB_FIXALL_LOG"
  status=${PIPESTATUS[0]}
  echo
  echo "📄 التقرير كاملاً محفوظ في:"
  echo "   $MOHASEB_FIXALL_LOG"
  echo "   لإظهاره كاملاً:  cat $MOHASEB_FIXALL_LOG"
  exit "$status"
fi

# shellcheck disable=SC1091
source "$APP_DIR/scripts/_activate.sh"
mohaseb_activate_node || exit 1

FAILED=""
STEP=0
TOTAL=9

step() {
  STEP=$((STEP + 1))
  echo
  echo "════════════════════════════════════════"
  echo "▶ $STEP/$TOTAL  $1"
  echo "════════════════════════════════════════"
}

fail() { FAILED="$FAILED
  ✗ $1"; }

# ── 1) تحديث الكود ─────────────────────────────
step "تحديث الكود من GitHub"
if git pull --ff-only 2>&1 | tail -3; then
  echo "   الإصدار: $(git rev-parse --short HEAD) — $(git log -1 --format=%s)"
else
  echo "   ⚠ تعذّر التحديث — نكمل بالنسخة الحالية"
  fail "تحديث الكود"
fi

# ── 2) نسخة احتياطية قبل أي تعديل ──────────────
step "نسخة احتياطية (قاعدة البيانات + الملفات)"
if node scripts/backup.mjs; then
  echo "   ✓ محفوظة في ~/mohaseb-backups"
else
  echo "   ⚠ تعذّرت النسخة الاحتياطية — خذ نسخة من phpMyAdmin ← Export إن أمكن"
  fail "النسخة الاحتياطية"
fi

# ── 3) الحزم ───────────────────────────────────
step "تثبيت الحزم"
npm install --include=dev || fail "تثبيت الحزم"

# ── 4) قاعدة البيانات ──────────────────────────
step "تحديث قاعدة البيانات"
npm run db:deploy || fail "هجرة قاعدة البيانات"
npx tsx prisma/add-programs.ts || true
npx tsx prisma/add-branches.ts || true

# ── 5) البناء ──────────────────────────────────
step "بناء التطبيق"
npm run build || fail "بناء التطبيق"

# ── 6) المهام التلقائية ────────────────────────
step "المهام التلقائية (تذكير، نسخ احتياطي، تنظيف، إبقاء مستيقظاً)"
bash scripts/setup-cron.sh || fail "تسجيل المهام التلقائية"

# ── 7) إعادة التشغيل ───────────────────────────
step "إعادة تشغيل التطبيق"
mkdir -p tmp && touch tmp/restart.txt && echo "   ✓ تم"

# ── 8) إصلاح السجلات التالفة ───────────────────
step "إصلاح السجلات التالفة (سبب أخطاء الصفحات)"
echo "السجل التالف = صف يشير إلى سجل محذوف (رحلة بلا برنامج، فاتورة برحلة محذوفة…)"
echo "لا يظهر في النظام أصلاً، ويُسقط الصفحة كلها بخطأ خادم. النسخة الاحتياطية أُخذت في الخطوة 2."
echo
node scripts/repair.mjs --yes || fail "إصلاح السجلات التالفة"

# ── 9) التشخيص والفحص ──────────────────────────
step "التشخيص والفحص النهائي"
node scripts/diagnose.mjs || true

APP_URL="$(sed -n 's/^[[:space:]]*APP_URL[[:space:]]*=[[:space:]]*//p' .env 2>/dev/null | head -n1 | sed 's/^["'"'"']//; s/["'"'"']$//; s|/$||')"
if [ -n "${APP_URL:-}" ]; then
  echo
  echo "▶ فحص الموقع ($APP_URL) …"
  REACHED=0
  for i in 1 2 3 4 5 6; do
    if curl -fsS -m 30 "$APP_URL/login" >/dev/null 2>&1; then
      REACHED=1
      break
    fi
    sleep 5
  done
  if [ "$REACHED" = "1" ]; then
    node scripts/smoke-test.mjs "$APP_URL" --public || fail "فحص الموقع"
  else
    # لم نصل للموقع أصلاً: غالباً العنوان في .env غير صحيح أو الشهادة/الدومين
    # لا يُفتح من داخل السيرفر — وليس بالضرورة عطلاً في التطبيق.
    echo "   ⚠ تعذّر الوصول إلى $APP_URL من داخل السيرفر."
    echo "     تأكد من صحة APP_URL في .env، وافتح الموقع بنفسك من المتصفح."
  fi
fi

# ── الخلاصة ────────────────────────────────────
echo
echo "════════════════════════════════════════"
if [ -z "$FAILED" ]; then
  echo "🎉 تم كل شيء بنجاح."
else
  echo "انتهى — مع ملاحظات:"
  echo "$FAILED"
fi
echo
echo "افتح الموقع وجرّب صفحة الفواتير وأوامر التكليف."
echo "التنظيف التلقائي للجداول يبقى معطَّلاً حتى تفعّله من: الإعدادات ← التنظيف التلقائي."
echo "════════════════════════════════════════"
