// إرسال البريد عبر SMTP (إعدادات من متغيّرات البيئة). كلمة المرور تبقى في .env فقط.
import nodemailer from "nodemailer";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function transport() {
  const port = Number(process.env.SMTP_PORT || 465);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465, // 465 = SSL ضمني، 587 = STARTTLS
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

function fromAddress(): string {
  return process.env.SMTP_FROM || process.env.SMTP_USER || "";
}

// إرسال رسالة واحدة إلى عدة مستلمين عبر BCC (نُخفي عناوين البقية)
export async function sendBulkEmail(
  recipients: string[],
  subject: string,
  html: string
): Promise<{ ok: number; failed: number; error?: string }> {
  if (!isEmailConfigured()) return { ok: 0, failed: recipients.length, error: "SMTP غير مُعدّ" };
  const list = [...new Set(recipients.map((r) => r.trim()).filter(Boolean))];
  if (list.length === 0) return { ok: 0, failed: 0 };
  try {
    const t = transport();
    // نرسل دفعات (BCC) حتى لا يرى المستلمون بعضهم — دفعة كل 40 عنواناً
    const from = fromAddress();
    let ok = 0;
    for (let i = 0; i < list.length; i += 40) {
      const batch = list.slice(i, i + 40);
      await t.sendMail({ from, to: from, bcc: batch, subject, html });
      ok += batch.length;
    }
    return { ok, failed: list.length - ok };
  } catch (e) {
    return { ok: 0, failed: list.length, error: (e as Error).message };
  }
}

// إرسال مستند (PDF) كمرفق إلى مستلم واحد
export async function sendDocumentEmail(opts: {
  to: string;
  subject: string;
  html: string;
  filename: string;
  pdf: Buffer;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isEmailConfigured()) return { ok: false, error: "SMTP غير مُعدّ" };
  const to = opts.to.trim();
  if (!to) return { ok: false, error: "لا يوجد بريد للمستلم" };
  try {
    const t = transport();
    await t.sendMail({
      from: fromAddress(),
      to,
      subject: opts.subject,
      html: opts.html,
      attachments: [{ filename: opts.filename, content: opts.pdf, contentType: "application/pdf" }],
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// قالب HTML بسيط بهوية الوكالة للعرض
export function offerEmailHtml(opts: {
  agencyName: string;
  color: string;
  body: string;
  website?: string | null;
  phone?: string | null;
}): string {
  const paragraphs = opts.body
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => `<p dir="auto" style="margin:0 0 12px;line-height:1.7;">${escapeHtml(l)}</p>`)
    .join("");
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <div style="max-width:600px;margin:0 auto;background:#fff;">
    <div style="background:${opts.color};color:#fff;padding:20px 24px;text-align:center;">
      <div style="font-size:22px;font-weight:bold;letter-spacing:1px;">${escapeHtml(opts.agencyName)}</div>
    </div>
    <div style="padding:24px;font-size:15px;">${paragraphs}</div>
    <div style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;text-align:center;">
      ${[opts.phone, opts.website].filter((x): x is string => Boolean(x)).map(escapeHtml).join(" &nbsp;·&nbsp; ")}
    </div>
  </div></body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] || c));
}
