#!/bin/bash
# تفعيل بيئة node على استضافة cPanel — يُستدعى من بقية السكربتات.
#
#   source "$(dirname "$0")/_activate.sh" && mohaseb_activate_node || exit 1
#
# سكربت التفعيل الذي تولّده cPanel يستعمل متغيّراً غير مُعرَّف (CL_VIRTUAL_ENV)،
# فيفشل داخل أي سكربت يعمل بـ `set -u`. نعطّل هذا الفحص أثناء التفعيل فقط،
# وإن فشل التفعيل نضيف مجلد node إلى PATH مباشرةً — وهو ما يكفي عملياً.

mohaseb_activate_node() {
  command -v node >/dev/null 2>&1 && return 0

  local app_dir candidate act=""
  app_dir="$(basename "$PWD")"

  for candidate in \
    "$HOME"/nodevenv/"$app_dir"/*/bin/activate \
    "$HOME"/nodevenv/*/*/bin/activate; do
    if [ -f "$candidate" ]; then
      act="$candidate"
      break
    fi
  done

  if [ -z "$act" ]; then
    echo "❌ لم أجد بيئة node على هذا الحساب."
    echo "   افتح cPanel ← Setup Node.js App وانسخ أمر التفعيل، ألصقه ثم أعد المحاولة."
    return 1
  fi

  echo "▶ بيئة node: $act"

  # نحفظ حالة `set -u` ونعطّلها أثناء التفعيل فقط
  local had_u=0
  case $- in *u*) had_u=1 ;; esac
  set +u
  # shellcheck disable=SC1090
  source "$act" >/dev/null 2>&1 || true
  [ "$had_u" = 1 ] && set -u

  # خطة بديلة: إضافة مجلد node إلى PATH مباشرةً
  if ! command -v node >/dev/null 2>&1; then
    PATH="$(dirname "$act"):$PATH"
    export PATH
  fi

  if command -v node >/dev/null 2>&1; then
    echo "▶ node: $(node -v)"
    return 0
  fi

  echo "❌ تعذّر تفعيل بيئة node."
  return 1
}
