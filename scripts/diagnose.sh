#!/bin/bash
# تشخيص النظام على استضافة cPanel — يفعّل بيئة node تلقائياً ثم يشغّل الفحص.
# استعمله عندما يعطي الترمنال:  bash: npm: command not found
#
#   cd ~/mohaseb-app && bash scripts/diagnose.sh

set -u

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

# بيئة node في cPanel لا تكون مفعّلة في جلسة SSH جديدة — نفعّلها بأنفسنا
if ! command -v node >/dev/null 2>&1; then
  ACTIVATE=""
  for candidate in \
    "$HOME"/nodevenv/"$(basename "$APP_DIR")"/*/bin/activate \
    "$HOME"/nodevenv/*/*/bin/activate; do
    if [ -f "$candidate" ]; then
      ACTIVATE="$candidate"
      break
    fi
  done

  if [ -n "$ACTIVATE" ]; then
    echo "▶ تفعيل بيئة node: $ACTIVATE"
    # shellcheck disable=SC1090
    source "$ACTIVATE"
  else
    echo "❌ لم أجد بيئة node على هذا الحساب."
    echo "   افتح cPanel ← Setup Node.js App، وانسخ أمر التفعيل الظاهر أعلى الصفحة،"
    echo "   الصقه في الترمنال، ثم أعد تشغيل هذا الأمر."
    exit 1
  fi
fi

echo "▶ node: $(command -v node) ($(node -v))"
echo
node scripts/diagnose.mjs
