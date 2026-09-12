// فحص سريع للمسارات الحرجة بعد كل تحديث — بلا متصفّح ولا حزم إضافية.
//
//   node scripts/smoke-test.mjs                       # يفحص http://localhost:3000
//   node scripts/smoke-test.mjs https://example.com   # أو أي عنوان آخر
//
// يتحقق من: صفحة الدخول، تسجيل دخول حقيقي، فتح الصفحات الأساسية بعد الدخول،
// أن صفحة التحقق من المستند (رمز QR) عامة، وأن مهام cron محميّة برمز سري.
// يفشل بالرمز 1 عند أول خطأ — صالح للتشغيل داخل سكربت النشر.
import fs from "fs";
import path from "path";

function envValue(key) {
  if (process.env[key]) return process.env[key];
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return "";
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(new RegExp(`^\\s*${key}\\s*=\\s*(.*)\\s*$`));
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  return "";
}

const BASE = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const EMAIL = envValue("SEED_ADMIN_EMAIL") || "agence.rozatour@gmail.com";
const PASSWORD = envValue("SEED_ADMIN_PASSWORD") || "RozaTour@2026";

let failures = 0;
const cookies = new Map();

function check(name, ok, detail = "") {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}

function storeCookies(res) {
  for (const raw of res.headers.getSetCookie?.() ?? []) {
    const [pair] = raw.split(";");
    const i = pair.indexOf("=");
    if (i > 0) cookies.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
  }
}

function cookieHeader() {
  return [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function get(pathname, { redirect = "manual" } = {}) {
  const res = await fetch(BASE + pathname, { redirect, headers: { cookie: cookieHeader() } });
  storeCookies(res);
  return res;
}

async function main() {
  console.log(`فحص ${BASE}\n`);

  // 1) صفحة الدخول تفتح
  check("صفحة الدخول تفتح", (await get("/login")).status === 200);

  // 2) الصفحات المحمية تحوّل إلى الدخول قبل تسجيل الدخول
  const guarded = await get("/trips");
  check("الصفحات محميّة قبل الدخول", guarded.status === 307 || guarded.status === 302);

  // 3) صفحة التحقق من المستند عامة (رمز QR على الفواتير والدعوات)
  const verify = await get("/verify/invoice/smoke-test-token");
  check("صفحة التحقق من المستند عامة", verify.status === 200, `الحالة ${verify.status}`);

  // 4) مهام cron ترفض الرمز الخاطئ
  for (const p of ["/api/reminders/email", "/api/cleanup"]) {
    const res = await get(`${p}?token=wrong-token`);
    check(`${p} يرفض الرمز الخاطئ`, res.status === 401, `الحالة ${res.status}`);
  }

  // 5) تسجيل دخول حقيقي
  const csrfRes = await get("/api/auth/csrf");
  const { csrfToken } = await csrfRes.json();
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: cookieHeader() },
    body: new URLSearchParams({ csrfToken, email: EMAIL, password: PASSWORD }).toString(),
  });
  storeCookies(loginRes);
  const loggedIn = [...cookies.keys()].some((c) => c.includes("session-token"));
  check("تسجيل الدخول بحساب المدير", loggedIn, loggedIn ? "" : "لم تُصدر كوكي الجلسة");

  if (!loggedIn) {
    console.log("\nتوقف الفحص: بقية الصفحات تحتاج جلسة.");
    process.exit(1);
  }

  // 6) الصفحات الأساسية تفتح بعد الدخول
  const pages = [
    ["لوحة التحكم", "/"],
    ["الرحلات", "/trips"],
    ["العملاء", "/customers"],
    ["الفواتير", "/invoices"],
    ["أوامر التكليف", "/task-orders"],
    ["أمر تكليف جديد", "/task-orders/new"],
    ["الدعوات", "/invitations"],
    ["القيود المحاسبية", "/accounting/transactions"],
    ["الميزانية الختامية المجملة", "/accounting/closing-summary"],
    ["جدول المهام", "/schedule"],
    ["الإعدادات", "/settings"],
  ];
  for (const [name, p] of pages) {
    const res = await get(p, { redirect: "follow" });
    check(name, res.status === 200, `الحالة ${res.status}`);
  }

  console.log(
    failures === 0 ? "\n✅ كل الفحوصات نجحت." : `\n❌ فشل ${failures} فحصاً — راجع ما سبق.`
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("تعذّر إكمال الفحص:", err.message);
  process.exit(1);
});
