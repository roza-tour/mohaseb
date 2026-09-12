// نسخة احتياطية تلقائية — للتشغيل عبر cron على cPanel.
// تحفظ ملف SQL لقاعدة البيانات + أرشيف الملفات المرفوعة (الشعار والختم والمرفقات)
// في ~/mohaseb-backups وتحذف النسخ الأقدم من 14 يوماً.
// الملفات كانت خارج النسخة تماماً: لو ضاع قرص الاستضافة تُفقد الجوازات والتذاكر نهائياً.
// التشغيل:  cd ~/mohaseb-app && node scripts/backup.mjs
import fs from "fs";
import path from "path";
import os from "os";
import { spawnSync } from "child_process";

function readDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*DATABASE_URL\s*=\s*(.*)\s*$/);
      if (m) return m[1].trim().replace(/^["']|["']$/g, "");
    }
  }
  return null;
}

const url = readDatabaseUrl();
if (!url) {
  console.error("DATABASE_URL غير موجود (شغّل الأمر من داخل ~/mohaseb-app)");
  process.exit(1);
}

const u = new URL(url);
const db = u.pathname.replace(/^\//, "");
const dir = path.join(os.homedir(), "mohaseb-backups");
fs.mkdirSync(dir, { recursive: true });

const now = new Date();
const p = (n) => String(n).padStart(2, "0");
const stamp = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}`;
const outFile = path.join(dir, `backup-${db}-${stamp}.sql`);

const res = spawnSync(
  "mysqldump",
  [
    `--host=${u.hostname}`,
    `--port=${u.port || "3306"}`,
    `--user=${decodeURIComponent(u.username)}`,
    "--single-transaction",
    "--default-character-set=utf8mb4",
    db,
  ],
  { env: { ...process.env, MYSQL_PWD: decodeURIComponent(u.password) }, maxBuffer: 1024 * 1024 * 512 }
);

if (res.status !== 0) {
  console.error("فشل mysqldump:", res.stderr?.toString() || res.error?.message);
  process.exit(1);
}

fs.writeFileSync(outFile, res.stdout);
console.log(`✓ نسخة قاعدة البيانات: ${outFile} (${res.stdout.length} bytes)`);

// ---------- الملفات المرفوعة: الشعار والختم (public/uploads) والمرفقات (private_uploads) ----------
const fileDirs = ["public/uploads", "private_uploads"].filter((d) =>
  fs.existsSync(path.join(process.cwd(), d))
);
if (fileDirs.length > 0) {
  const filesOut = path.join(dir, `files-${stamp}.tar.gz`);
  const tar = spawnSync("tar", ["-czf", filesOut, ...fileDirs], { cwd: process.cwd() });
  if (tar.status === 0) {
    console.log(`✓ نسخة الملفات: ${filesOut}`);
  } else {
    console.error("تعذّر أرشفة الملفات:", tar.stderr?.toString() || tar.error?.message);
  }
} else {
  console.log("لا توجد ملفات مرفوعة لأرشفتها.");
}

// حذف النسخ الأقدم من 14 يوماً
const cutoff = Date.now() - 14 * 86400000;
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith(".sql") && !f.endsWith(".tar.gz")) continue;
  const fp = path.join(dir, f);
  if (fs.statSync(fp).mtimeMs < cutoff) {
    fs.unlinkSync(fp);
    console.log("حُذفت نسخة قديمة:", f);
  }
}
