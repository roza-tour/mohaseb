// نقطة تشغيل التطبيق على استضافة cPanel المشتركة (Phusion Passenger).
// في "Setup Node.js App" اجعل Application startup file = server.js
// Passenger يمرر رقم المنفذ عبر متغير البيئة PORT تلقائياً.
// نثبّت المنطقة الزمنية على UTC حتى تُخزَّن التواريخ وتُعرض بنفس اليوم بالضبط
// أياً كانت المنطقة الزمنية لخادم الاستضافة (سيرفرات cPanel كثيراً ما تكون بتوقيت أمريكي).
// يجب ضبطها قبل أي استخدام لـ Date.
process.env.TZ = "UTC";

const { createServer } = require("http");
const next = require("next");

process.env.NODE_ENV = "production";

const port = parseInt(process.env.PORT || "3000", 10);
const app = next({ dev: false });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    createServer((req, res) => {
      // صفحات المسارات الديناميكية ([id]) داخل المجموعة (app) لها ملفات جافاسكريبت
      // بمسارات فيها أقواس. المتصفح يطلبها مشفّرة (%28app%29/visa/%5Bid%5D) والخادم
      // يرجع 404 لهذه الصيغة، بينما الصيغة غير المشفّرة تعمل. فنفكّ التشفير هنا
      // لملفات _next/static فقط، فتفتح صفحات التعديل (الفيزا، الفواتير…) من جديد.
      if (req.url && req.url.startsWith("/_next/static/") && req.url.includes("%")) {
        try {
          req.url = decodeURI(req.url);
        } catch {
          /* عنوان مشوّه: نتركه كما هو */
        }
      }
      return handle(req, res);
    }).listen(port, () => {
      console.log(`mohaseb ready on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("failed to start next server", err);
    process.exit(1);
  });
