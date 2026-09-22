// قراءة باراميترات الرابط دون أن ترمي خطأ.
//
// `new URL(req.url)` يرمي «Invalid URL» إذا وصل العنوان نسبياً (بلا نطاق)،
// وهو ما يحدث أحياناً خلف Passenger على cPanel. النتيجة كانت خطأ خادم كامل
// في مسارات PDF وواجهات Cron بدل أن تُقرأ اللغة أو الرمز السري ببساطة.
export function searchParamsOf(url: string): URLSearchParams {
  try {
    return new URL(url).searchParams;
  } catch {
    // عنوان نسبي مثل «/invoices/xx/pdf?lang=fr» — نقرأ ما بعد علامة الاستفهام
    const qs = url.slice(url.indexOf("?") + 1);
    return new URLSearchParams(url.includes("?") ? qs : "");
  }
}
