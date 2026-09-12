#!/bin/bash
# تفعيل المهام التلقائية على الاستضافة (cPanel):
# التذكير اليومي بالبريد + النسخة الاحتياطية + التنظيف التلقائي للجداول.
# يضيف المتغيّرات الناقصة في .env، ويسجّل مهمتَي cron، ثم يعيد تشغيل التطبيق.
# آمن للتشغيل أكثر من مرة — لا يكرّر شيئاً موجوداً.
#
#   cd ~/mohaseb-app && bash scripts/setup-cron.sh

set -u

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$APP_DIR/.env"

echo "📂 مجلد التطبيق: $APP_DIR"
echo

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ لم أجد ملف .env في $APP_DIR"
  echo "   شغّل الأمر من داخل مجلد التطبيق (cd ~/mohaseb-app)."
  exit 1
fi

# ---------- 1) متغيّرات البيئة ----------
echo "1️⃣  فحص ملف .env ..."

# يقرأ قيمة مفتاح من .env (فارغ إن لم يوجد)
get_env() {
  sed -n "s/^[[:space:]]*$1[[:space:]]*=[[:space:]]*//p" "$ENV_FILE" | head -n1 | sed 's/^["'\'']//; s/["'\'']$//'
}

# يضيف مفتاحاً إن لم يكن موجوداً
add_env_if_missing() {
  local key="$1" value="$2" note="$3"
  if grep -qE "^[[:space:]]*$key[[:space:]]*=" "$ENV_FILE"; then
    echo "   ✓ $key موجود بالفعل"
  else
    printf '\n# %s\n%s="%s"\n' "$note" "$key" "$value" >> "$ENV_FILE"
    echo "   + أُضيف $key"
    ENV_CHANGED=1
  fi
}

ENV_CHANGED=0

# رمز سري عشوائي لتشغيل التذكير عبر cron بدون تسجيل دخول
CRON_SECRET="$(get_env CRON_SECRET)"
if [ -z "$CRON_SECRET" ]; then
  CRON_SECRET="$(node -e 'console.log(require("crypto").randomBytes(24).toString("hex"))' 2>/dev/null)"
  if [ -z "$CRON_SECRET" ]; then
    CRON_SECRET="$(head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  fi
fi
add_env_if_missing CRON_SECRET "$CRON_SECRET" "رمز سري لتشغيل التذكير اليومي عبر cron"

# عنوان التطبيق (يُستعمل في روابط QR للتحقق من المستندات)
APP_URL="$(get_env APP_URL)"
[ -z "$APP_URL" ] && APP_URL="https://mohaseb.rozatour-booking.com"
add_env_if_missing APP_URL "$APP_URL" "عنوان التطبيق العام (روابط QR للتحقق)"

# بريد استقبال التذكير اليومي
REMINDER_TO="$(get_env REMINDER_TO)"
[ -z "$REMINDER_TO" ] && REMINDER_TO="agence.rozatour@gmail.com"
add_env_if_missing REMINDER_TO "$REMINDER_TO" "بريد استقبال التذكير اليومي"

# نقرأ القيم النهائية من الملف (سواء كانت موجودة أصلاً أو أُضيفت الآن)
CRON_SECRET="$(get_env CRON_SECRET)"
APP_URL="$(get_env APP_URL)"
APP_URL="${APP_URL%/}"
echo

# ---------- 2) مهام cron ----------
echo "2️⃣  تسجيل المهام التلقائية (cron) ..."

# cron لا يفعّل بيئة nodevenv، لذا نحدّد مسار node الكامل الآن
NODE_BIN="$(command -v node || true)"
if [ -z "$NODE_BIN" ]; then
  NODE_BIN="$(ls -d "$HOME"/nodevenv/mohaseb-app/*/bin/node 2>/dev/null | head -n1 || true)"
fi
if [ -z "$NODE_BIN" ]; then
  echo "   ⚠️  لم أجد node. فعّل البيئة أولاً ثم أعد التشغيل:"
  echo "      source ~/nodevenv/mohaseb-app/*/bin/activate"
  exit 1
fi
echo "   node: $NODE_BIN"

REMINDER_CMD="curl -fsS \"$APP_URL/api/reminders/email?token=$CRON_SECRET\" >/dev/null 2>&1 # MOHASEB_REMINDER"
# التنظيف التلقائي: لا يحذف شيئاً ما لم تفعّله من صفحة الإعدادات
CLEANUP_CMD="curl -fsS \"$APP_URL/api/cleanup?token=$CRON_SECRET\" >/dev/null 2>&1 # MOHASEB_CLEANUP"
BACKUP_CMD="cd $APP_DIR && $NODE_BIN scripts/backup.mjs >> \$HOME/mohaseb-backups/backup.log 2>&1 # MOHASEB_BACKUP"

mkdir -p "$HOME/mohaseb-backups"

# نبني جدول cron جديداً: نحذف أسطرنا القديمة (بالعلامة) ثم نضيف المحدَّثة
CURRENT="$(crontab -l 2>/dev/null || true)"
NEW="$(printf '%s\n' "$CURRENT" | grep -v 'MOHASEB_REMINDER' | grep -v 'MOHASEB_BACKUP' | grep -v 'MOHASEB_CLEANUP' | sed '/^$/d')"
NEW="$(printf '%s\n0 7 * * * %s\n0 3 * * * %s\n30 3 * * * %s\n' "$NEW" "$REMINDER_CMD" "$BACKUP_CMD" "$CLEANUP_CMD" | sed '/^$/d')"

if printf '%s\n' "$NEW" | crontab - 2>/dev/null; then
  echo "   ✓ التذكير اليومي: كل يوم الساعة 7:00 صباحاً"
  echo "   ✓ النسخة الاحتياطية: كل يوم الساعة 3:00 فجراً"
  echo "   ✓ التنظيف التلقائي: كل يوم الساعة 3:30 فجراً (بعد الباك أب، ولا يعمل إلا إن فعّلته من الإعدادات)"
else
  echo "   ⚠️  تعذّر تسجيل cron من الترمنال."
  echo "      أضِفهما يدوياً من cPanel ← Cron Jobs:"
  echo
  echo "      [0 7 * * *]  $REMINDER_CMD"
  echo "      [0 3 * * *]  $BACKUP_CMD"
fi
echo

# ---------- 3) فحوصات سريعة ----------
echo "3️⃣  فحوصات ..."
if command -v mysqldump >/dev/null 2>&1; then
  echo "   ✓ mysqldump متاح (النسخة الاحتياطية ستعمل)"
else
  echo "   ⚠️  mysqldump غير متاح على هذا الخادم — النسخة الاحتياطية لن تعمل."
  echo "      استخدمي بدلاً منها phpMyAdmin ← Export، أو اطلبي تفعيله من الدعم."
fi

if grep -qE '^[[:space:]]*SMTP_PASS[[:space:]]*=[[:space:]]*["'\'']?.+' "$ENV_FILE" \
   && ! grep -q 'SMTP_PASS="بريد-الحساب-كلمة-المرور"' "$ENV_FILE"; then
  echo "   ✓ إعدادات البريد (SMTP) مضبوطة"
else
  echo "   ⚠️  كلمة مرور البريد (SMTP_PASS) غير مضبوطة في .env — التذكير بالبريد لن يُرسَل."
fi
echo

# ---------- 4) إعادة التشغيل ----------
if [ "$ENV_CHANGED" = "1" ]; then
  mkdir -p "$APP_DIR/tmp" && touch "$APP_DIR/tmp/restart.txt"
  echo "4️⃣  ✓ أُعيد تشغيل التطبيق (تغيّرت إعدادات .env)"
else
  echo "4️⃣  لا حاجة لإعادة التشغيل (لم تتغيّر .env)"
fi

echo
echo "════════════════════════════════════"
echo "✅ تم التفعيل."
echo
echo "للتجربة الآن بدون انتظار:"
echo "  • التذكير:  اضغطي زر «✉️ أرسل تذكيراً الآن» في لوحة التحكم"
echo "  • الباك أب: $NODE_BIN $APP_DIR/scripts/backup.mjs"
echo "  • التنظيف:  الإعدادات ← التنظيف التلقائي (يعرض كم سيُحذف قبل التفعيل)"
echo "════════════════════════════════════"
