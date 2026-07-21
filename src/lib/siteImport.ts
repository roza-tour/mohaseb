// استيراد الرحلات من الموقع الرسمي للوكالة (rozatour-booking.com)
// يجلب صفحة الوجهة ويستخرج الرحلات من بيانات JSON-LD المهيكلة أولاً،
// ثم من روابط الجولات في الصفحة كخطة بديلة — النتيجة معاينة قابلة للتعديل قبل الحفظ.

export type ImportedProgram = {
  name: string;
  durationDays: number;
  price: number;
  currency: string;
  description: string;
  sourceUrl: string;
};

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, " ")
    .trim();
}

// "8 Days" / "7 jours" / "٨ أيام" / "5 Days 4 Nights" → عدد الأيام
function extractDuration(text: string): number | null {
  const days = text.match(/(\d+)\s*(?:days?|jours?|يوم|أيام)/i);
  if (days) return parseInt(days[1], 10);
  const nights = text.match(/(\d+)\s*(?:nights?|nuits?|ليال|ليلة)/i);
  if (nights) return parseInt(nights[1], 10) + 1;
  return null;
}

type JsonLdNode = Record<string, unknown>;

function collectJsonLdNodes(value: unknown, out: JsonLdNode[]): void {
  if (Array.isArray(value)) {
    for (const v of value) collectJsonLdNodes(v, out);
    return;
  }
  if (value && typeof value === "object") {
    const node = value as JsonLdNode;
    out.push(node);
    if (node["@graph"]) collectJsonLdNodes(node["@graph"], out);
    if (node.itemListElement) collectJsonLdNodes(node.itemListElement, out);
    if (node.item) collectJsonLdNodes(node.item, out);
  }
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function num(v: unknown): number {
  if (typeof v === "number" && isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/[^\d.]/g, ""));
    if (isFinite(n)) return n;
  }
  return 0;
}

function fromJsonLd(html: string, baseUrl: string): ImportedProgram[] {
  const results: ImportedProgram[] = [];
  const scripts = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  for (const m of scripts) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(m[1].trim());
    } catch {
      continue;
    }
    const nodes: JsonLdNode[] = [];
    collectJsonLdNodes(parsed, nodes);

    for (const node of nodes) {
      const types = ([] as string[]).concat((node["@type"] as string | string[]) ?? []);
      const isTripType = types.some((t) =>
        ["Product", "Trip", "TouristTrip", "Event", "TouristAttraction"].includes(t)
      );
      if (!isTripType) continue;

      const name = decodeEntities(str(node.name));
      if (!name) continue;

      const offers = (Array.isArray(node.offers) ? node.offers[0] : node.offers) as
        | JsonLdNode
        | undefined;
      const description = decodeEntities(str(node.description)).slice(0, 500);
      const duration =
        extractDuration(str(node.duration)) ??
        extractDuration(name) ??
        extractDuration(description) ??
        1;

      results.push({
        name,
        durationDays: duration,
        price: num(offers?.price ?? offers?.lowPrice),
        currency: str(offers?.priceCurrency) || "DZD",
        description,
        sourceUrl: str(node.url) || baseUrl,
      });
    }
  }
  return results;
}

// خطة بديلة: روابط صفحات الجولات داخل الصفحة نفسها
function fromLinks(html: string, baseUrl: string): ImportedProgram[] {
  const results: ImportedProgram[] = [];
  const seen = new Set<string>();
  const anchors = html.matchAll(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi);
  for (const m of anchors) {
    const href = m[1];
    if (!/\/(tour|trip|package|circuit|excursion)s?\//i.test(href)) continue;
    const text = decodeEntities(m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
    if (text.length < 4 || text.length > 120) continue;
    if (/^(book|reserve|read|view|more|détails|voir)/i.test(text)) continue;
    const url = href.startsWith("http") ? href : new URL(href, baseUrl).toString();
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({
      name: text,
      durationDays: extractDuration(text) ?? 1,
      price: 0,
      currency: "DZD",
      description: "",
      sourceUrl: url,
    });
  }
  return results;
}

// منع طلبات الخادم لعناوين داخلية (SSRF): نسمح فقط بـ https ونرفض المضيفات الخاصة/المحلية
function assertSafeUrl(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("رابط غير صالح");
  }
  if (u.protocol !== "https:") {
    throw new Error("يجب أن يبدأ الرابط بـ https://");
  }
  const host = u.hostname.toLowerCase();
  const blocked =
    host === "localhost" ||
    host === "0.0.0.0" ||
    host === "[::1]" ||
    host.endsWith(".localhost") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  if (blocked) {
    throw new Error("لا يُسمح باستيراد من عنوان داخلي");
  }
  return u;
}

export async function fetchProgramsFromSite(url: string): Promise<ImportedProgram[]> {
  assertSafeUrl(url);
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
    // لا نريد تخزيناً مؤقتاً — نجلب أحدث نسخة من الموقع كل مرة
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    throw new Error(`تعذر الوصول للموقع (HTTP ${res.status}) — تأكد من الرابط وحاول مجدداً`);
  }
  const html = await res.text();

  const jsonLd = fromJsonLd(html, url);
  const found = jsonLd.length > 0 ? jsonLd : fromLinks(html, url);

  // إزالة التكرار بالاسم
  const seen = new Set<string>();
  return found.filter((p) => {
    const key = p.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
