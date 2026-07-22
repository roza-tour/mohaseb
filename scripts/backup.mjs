// نسخة احتياطية تلقائية لقاعدة البيانات (mysqldump) — للتشغيل عبر cron على cPanel.
// تحفظ ملف SQL في ~/mohaseb-backups وتحذف النسخ الأقدم من 14 يوماً.
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
console.log(`✓ نسخة احتياطية: ${outFile} (${res.stdout.length} bytes)`);

// حذف النسخ الأقدم من 14 يوماً
const cutoff = Date.now() - 14 * 86400000;
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith(".sql")) continue;
  const fp = path.join(dir, f);
  if (fs.statSync(fp).mtimeMs < cutoff) {
    fs.unlinkSync(fp);
    console.log("حُذفت نسخة قديمة:", f);
  }
}
