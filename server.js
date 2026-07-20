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
    createServer((req, res) => handle(req, res)).listen(port, () => {
      console.log(`mohaseb ready on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("failed to start next server", err);
    process.exit(1);
  });
