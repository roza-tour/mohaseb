// تشخيص شامل للنظام على السيرفر — يقول لك بالضبط أين العطل.
//
//   cd ~/mohaseb-app && node scripts/diagnose.mjs
//
// يفحص: النسخة المنشورة، ملف .env، الاتصال بقاعدة البيانات، هل طُبِّقت الهجرات،
// بيانات أوامر التكليف، توليد ملفات PDF فعلياً (الخط والذاكرة)، الملفات المرفوعة،
// وآخر الأخطاء في stderr.log. لا يعدّل شيئاً — قراءة فقط.
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const ROOT = process.cwd();
let problems = 0;

const ok = (m, d = "") => console.log(`  ✓ ${m}${d ? ` — ${d}` : ""}`);
const bad = (m, d = "") => {
  problems += 1;
  console.log(`  ✗ ${m}${d ? ` — ${d}` : ""}`);
};
const warn = (m, d = "") => console.log(`  ⚠ ${m}${d ? ` — ${d}` : ""}`);
const head = (t) => console.log(`\n──────── ${t} ────────`);

function sh(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
}

function loadEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim().replace(/^["']|["']$/g, "");
    out[m[1]] = v;
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
  return out;
}

// ============ 1) النسخة المنشورة ============
head("النسخة المنشورة");
const branch = sh("git rev-parse --abbrev-ref HEAD");
const commit = sh("git rev-parse --short HEAD");
const subject = sh("git log -1 --format=%s");
const dirty = sh("git status --porcelain");
console.log(`  الفرع: ${branch || "غير معروف"}`);
console.log(`  آخر كوميت: ${commit} — ${subject}`);
if (dirty) warn("توجد تعديلات محلية غير محفوظة", `${dirty.split("\n").length} ملف`);

// هل الكود المنشور يحتوي الإصلاحات؟ (نفحص وجود ملفات أُضيفت فيها)
const newFiles = ["src/lib/docNumbers.ts", "src/lib/tripCleanup.ts", "src/lib/authz.ts", "src/app/api/cleanup/route.ts"];
const missing = newFiles.filter((f) => !fs.existsSync(path.join(ROOT, f)));
if (missing.length === 0) {
  ok("الكود يحتوي آخر الإصلاحات");
} else {
  bad("الكود قديم — الإصلاحات غير منشورة", `ناقص: ${missing.join(", ")}`);
  console.log("     الحل:  git fetch origin && git checkout main && git pull && bash scripts/deploy.sh");
}

// هل البناء أحدث من الكود؟
const nextDir = path.join(ROOT, ".next");
if (!fs.existsSync(nextDir)) {
  bad("لا يوجد مجلد .next — التطبيق لم يُبنَ", "شغّل: npm run build");
} else {
  const buildTime = fs.statSync(nextDir).mtimeMs;
  const newest = newFiles
    .filter((f) => fs.existsSync(path.join(ROOT, f)))
    .map((f) => fs.statSync(path.join(ROOT, f)).mtimeMs);
  const srcTime = newest.length ? Math.max(...newest) : 0;
  if (srcTime > buildTime) {
    bad("البناء أقدم من الكود — التعديلات لم تُبنَ بعد", "شغّل: npm run build ثم Restart");
  } else {
    ok("البناء أحدث من الكود", new Date(buildTime).toISOString().slice(0, 16).replace("T", " "));
  }
}

// ============ 2) ملف .env ============
head("الإعدادات (.env)");
const env = loadEnv();
if (Object.keys(env).length === 0) bad("ملف .env غير موجود أو فارغ");
for (const key of ["DATABASE_URL", "AUTH_SECRET"]) {
  env[key] ? ok(`${key} موجود`) : bad(`${key} مفقود — التطبيق لن يعمل`);
}
for (const key of ["APP_URL", "CRON_SECRET", "SMTP_HOST", "SMTP_PASS"]) {
  env[key] ? ok(`${key} موجود`) : warn(`${key} غير مضبوط`, key.startsWith("SMTP") ? "البريد لن يُرسَل" : "");
}

// ============ 3) قاعدة البيانات ============
head("قاعدة البيانات");
let prisma = null;
try {
  const { PrismaClient } = await import("@prisma/client");
  prisma = new PrismaClient();
  await prisma.$queryRawUnsafe("SELECT 1");
  ok("الاتصال بقاعدة البيانات ناجح");
} catch (e) {
  bad("تعذّر الاتصال بقاعدة البيانات", String(e.message).split("\n")[0]);
}

if (prisma) {
  // الهجرات المطبَّقة
  try {
    const rows = await prisma.$queryRawUnsafe(
      "SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 3"
    );
    console.log("  آخر الهجرات المطبَّقة:");
    for (const r of rows) console.log(`    • ${r.migration_name}`);
  } catch {
    warn("تعذّر قراءة جدول الهجرات");
  }

  // هل طُبِّقت هجرة الإصلاحات الأخيرة؟
  const checks = [
    ["جدول Counter (ترقيم المستندات)", "SELECT 1 FROM Counter LIMIT 1"],
    ["جدول LoginAttempt (حماية الدخول)", "SELECT 1 FROM LoginAttempt LIMIT 1"],
    ["عمود Settings.autoCleanupEnabled (التنظيف)", "SELECT autoCleanupEnabled FROM Settings LIMIT 1"],
  ];
  let migrationMissing = false;
  for (const [label, sql] of checks) {
    try {
      await prisma.$queryRawUnsafe(sql);
      ok(label);
    } catch {
      bad(label, "غير موجود");
      migrationMissing = true;
    }
  }
  if (migrationMissing) {
    console.log("     ⇐ هذا يعطّل صفحات كثيرة (منها توليد PDF لأنه يقرأ الإعدادات).");
    console.log("     الحل:  npm run db:deploy  ثم  npm run build  ثم Restart");
  }

  // ============ 4) بيانات أوامر التكليف ============
  head("أوامر التكليف");
  try {
    const [orders, guides, drivers, trips] = await Promise.all([
      prisma.taskOrder.count(),
      prisma.guide.count(),
      prisma.driver.count(),
      prisma.trip.count(),
    ]);
    console.log(`  العدد: ${orders} أمر تكليف · ${trips} رحلة · ${guides} مرشد · ${drivers} سائق`);
    if (trips === 0) bad("لا توجد رحلات", "أمر التكليف يرتبط برحلة — أنشئ رحلة أولاً");
    if (guides === 0 && drivers === 0) {
      bad("لا يوجد مرشدون ولا سائقون", "لن تستطيع اختيار مكلَّف — أضفهم أولاً من صفحتي المرشدين والسائقين");
    }

    // ── سجلات يتيمة: تشير إلى سجل أب غير موجود (تحدث عند الحذف اليدوي من
    //    phpMyAdmin أو استعادة نسخة ناقصة). سطر واحد منها كان يُسقط الصفحة بخطأ 500.
    const orphanChecks = [
      ["أوامر تكليف بلا رحلة", "TaskOrder", "tripId", "Trip"],
      ["حجوزات فنادق بلا رحلة", "HotelBooking", "tripId", "Trip"],
      ["حجوزات طيران بلا رحلة", "FlightBooking", "tripId", "Trip"],
      ["سندات قبض بلا رحلة", "Payment", "tripId", "Trip"],
      ["مرفقات بلا رحلة", "Attachment", "tripId", "Trip"],
      ["رحلات بلا برنامج", "Trip", "programId", "TourProgram"],
      ["رحلات بلا عميل", "Trip", "customerId", "Customer"],
    ];
    let orphanTotal = 0;
    for (const [label, table, col, parent] of orphanChecks) {
      try {
        const r = await prisma.$queryRawUnsafe(
          `SELECT COUNT(*) AS n FROM \`${table}\` c LEFT JOIN \`${parent}\` p ON p.id = c.\`${col}\` WHERE c.\`${col}\` IS NOT NULL AND p.id IS NULL`
        );
        const n = Number(r?.[0]?.n ?? 0);
        if (n > 0) {
          bad(`${label}: ${n}`, "تُسقط الصفحة بخطأ خادم");
          orphanTotal += n;
        }
      } catch {
        /* تعذّر الفحص — نتجاهل */
      }
    }
    if (orphanTotal === 0) {
      ok("لا توجد سجلات يتيمة (كل السجلات مرتبطة بأصلها)");
    } else {
      console.log(`     ⇐ هذا سبب شائع لرسالة «A server error occurred» في صفحة بعينها.`);
      console.log(`     الحل:  node scripts/repair.mjs        (يعرض ما سيُحذف)`);
      console.log(`            node scripts/repair.mjs --yes  (ينفّذ الحذف)`);
    }

    const orphans = await prisma.taskOrder.count({ where: { guideId: null, driverId: null } });
    if (orphans > 0) {
      warn(`${orphans} أمر تكليف بلا مكلَّف`, "حُذف المرشد/السائق بعد إصدار الأمر — عدّل الأمر واختر مكلَّفاً");
    } else if (orders > 0) {
      ok("كل الأوامر لها مكلَّف");
    }

    // أوامر مرتبطة برحلة محذوفة (لا يفترض حدوثها — قيد قاعدة البيانات يمنعها)
    const sample = await prisma.taskOrder.findFirst({
      include: { trip: { include: { program: true, customer: true } }, guide: true, driver: true },
      orderBy: { taskDate: "desc" },
    });
    if (sample) {
      console.log(
        `  أحدث أمر: ${sample.trip?.program?.name ?? "؟"} — ${sample.guide?.name ?? sample.driver?.name ?? "بلا مكلَّف"} — ${new Date(sample.taskDate).toISOString().slice(0, 10)}`
      );
    }
  } catch (e) {
    bad("تعذّر قراءة أوامر التكليف", String(e.message).split("\n")[0]);
  }

  // ============ 5) إعدادات الوكالة والملفات ============
  head("الإعدادات والملفات");
  let settings = null;
  try {
    settings = await prisma.settings.findUnique({ where: { id: 1 } });
    settings ? ok("سجل الإعدادات موجود") : bad("سجل الإعدادات مفقود", "شغّل: npm run db:seed");
  } catch (e) {
    bad("تعذّر قراءة الإعدادات (غالباً هجرة ناقصة)", String(e.message).split("\n")[0]);
  }
  for (const [label, rel] of [
    ["خط Tajawal العادي", "public/fonts/Tajawal-Regular.ttf"],
    ["خط Tajawal العريض", "public/fonts/Tajawal-Bold.ttf"],
  ]) {
    fs.existsSync(path.join(ROOT, rel)) ? ok(label) : bad(label, "مفقود — كل ملفات PDF ستفشل");
  }
  for (const key of ["logoPath", "stampPath"]) {
    const rel = settings?.[key];
    if (!rel) {
      warn(`${key === "logoPath" ? "الشعار" : "الختم"} غير مرفوع`);
      continue;
    }
    const full = path.join(ROOT, "public", String(rel).replace(/^\//, ""));
    fs.existsSync(full)
      ? ok(`${key === "logoPath" ? "الشعار" : "الختم"} موجود`, rel)
      : bad(`${key === "logoPath" ? "الشعار" : "الختم"} مسجَّل لكن الملف مفقود`, String(rel));
  }
}

// ============ 6) توليد PDF فعلياً ============
head("توليد ملفات PDF");
try {
  const t0 = Date.now();
  const React = (await import("react")).default;
  const { Document, Page, Text, Font, renderToBuffer } = await import("@react-pdf/renderer");
  const regular = path.join(ROOT, "public/fonts/Tajawal-Regular.ttf");
  if (fs.existsSync(regular)) Font.register({ family: "Tajawal", fonts: [{ src: regular }] });
  const doc = React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: { fontFamily: fs.existsSync(regular) ? "Tajawal" : undefined, padding: 40 } },
      React.createElement(Text, null, "اختبار توليد أمر تكليف — نص عربي تجريبي")
    )
  );
  const buf = await renderToBuffer(doc);
  ok("توليد PDF يعمل", `${buf.length} بايت في ${Date.now() - t0}ms`);
} catch (e) {
  bad("فشل توليد PDF", String(e.message).split("\n")[0]);
  console.log("     ⇐ هذا يفسّر ظهور أوامر التكليف والفواتير وكأنها معطّلة (الإصدار ينتهي بصفحة خطأ).");
}

const mem = process.memoryUsage().rss / 1024 / 1024;
console.log(`  ذاكرة هذه العملية: ${mem.toFixed(0)} ميغابايت`);

// ============ 7) آخر الأخطاء ============
head("آخر الأخطاء (stderr.log)");
const logPath = path.join(ROOT, "stderr.log");
if (!fs.existsSync(logPath)) {
  console.log("  لا يوجد ملف stderr.log");
} else {
  const lines = fs.readFileSync(logPath, "utf8").split(/\r?\n/);
  const errs = lines.filter((l) => /error|Error|ERR_|Unknown column|ECONNREFUSED|heap/.test(l)).slice(-12);
  if (errs.length === 0) console.log("  لا توجد أخطاء حديثة");
  else {
    problems += 1;
    for (const l of errs) console.log("  » " + l.slice(0, 200));
  }
}

// ============ الخلاصة ============
head("الخلاصة");
if (problems === 0) {
  console.log("  ✅ لم أجد عطلاً في الخادم — لو المشكلة مستمرة في المتصفح:");
  console.log("     • جرّب متصفحاً آخر أو نافذة خاصة (كوكيز جلسة قديمة).");
  console.log("     • صوّر الشاشة عند حدوث المشكلة وأرسلها.");
} else {
  console.log(`  وجدت ${problems} مشكلة — راجع السطور المعلَّمة ✗ أعلاه واتبع «الحل» المكتوب تحتها.`);
}
console.log("");

if (prisma) await prisma.$disconnect();
process.exit(0);
