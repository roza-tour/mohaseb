#!/bin/bash
# تشخيص النظام على الاستضافة — يفعّل بيئة node تلقائياً ثم يشغّل الفحص.
# استعمله عندما يعطي الترمنال:  bash: npm: command not found
#
#   cd ~/mohaseb-app && bash scripts/diagnose.sh

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR" || exit 1

# shellcheck disable=SC1091
source "$APP_DIR/scripts/_activate.sh"
mohaseb_activate_node || exit 1

echo
node scripts/diagnose.mjs
