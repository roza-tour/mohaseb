# محاسب — نظام محاسبة وحجوزات لوكالة روزا تور السياحية

تطبيق ويب متكامل لإدارة الأمور المحاسبية والحجوزات الخاصة بوكالة سياحية: ميزانيات افتتاحية وختامية (مجملة ومفصلة لكل برنامج)، حجوزات الفنادق والطيران وغيرها، قواعد بيانات العملاء والفنادق والمرشدين والسائقين، إصدار أوامر تكليف بصيغة PDF مع إدراج ختم الوكالة تلقائياً، تنبيهات بالرحلات القادمة، وأداة لاقتراح رحلة وتسعيرها.

## التقنيات

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Prisma 6 (**MySQL**) · NextAuth v5 · @react-pdf/renderer

## المتطلبات

- Node.js **20 أو أحدث** (تأكد أن استضافتك توفر هذا الإصدار في Setup Node.js App)
- قاعدة بيانات MySQL 5.7+ / MariaDB 10.3+

## التشغيل المحلي

```bash
npm install
cp .env.example .env        # عدّل DATABASE_URL و AUTH_SECRET
npx prisma migrate deploy   # ينشئ الجداول في قاعدة MySQL
npm run db:seed             # ينشئ حساب المدير الأول والإعدادات الافتراضية
npm run dev
```

ثم افتح http://localhost:3000 وسجّل الدخول بالحساب الذي طبعه أمر `db:seed` (افتراضياً `agence.rozatour@gmail.com` / `RozaTour@2026` ما لم تُحدَّد `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` في `.env`).

**غيّر كلمة المرور فوراً بعد أول تسجيل دخول** من صفحة الإعدادات → تغيير كلمة المرور.

## النشر على استضافة مشتركة بلوحة cPanel

### 1) قاعدة البيانات (MySQL® Databases في cPanel)
1. أنشئ قاعدة بيانات جديدة (مثلاً `mohaseb` — ستصبح `cpaneluser_mohaseb`).
2. أنشئ مستخدم قاعدة بيانات بكلمة مرور قوية.
3. أضف المستخدم إلى القاعدة وامنحه **ALL PRIVILEGES**.
4. ركّب رابط الاتصال: `mysql://cpaneluser_dbuser:PASSWORD@localhost:3306/cpaneluser_mohaseb`

### 2) رفع الملفات
ارفع محتوى المشروع (بدون `node_modules` و`.next`) إلى مجلد خارج `public_html`، مثلاً `~/apps/mohaseb` (عبر Git™ Version Control في cPanel أو File Manager/ZIP).

### 3) إنشاء التطبيق (Setup Node.js App في cPanel)
1. **Create Application**: اختر Node.js **20+**، وضع Production.
2. **Application root**: مسار المجلد الذي رفعت إليه (مثل `apps/mohaseb`).
3. **Application URL**: الدومين أو الساب-دومين المطلوب.
4. **Application startup file**: `server.js`
5. أضف متغيرات البيئة (Environment Variables):
   - `DATABASE_URL` = رابط الاتصال من الخطوة 1
   - `AUTH_SECRET` = سلسلة عشوائية طويلة (`openssl rand -base64 32`)
6. احفظ، ثم من نفس الصفحة انسخ أمر تفعيل البيئة الافتراضية (يظهر أعلى الصفحة بصيغة `source /home/USER/nodevenv/...`).

### 4) التثبيت والبناء (عبر Terminal في cPanel)
```bash
source /home/USER/nodevenv/apps/mohaseb/20/bin/activate && cd ~/apps/mohaseb
npm install --include=dev     # البناء يحتاج حزم التطوير (typescript, tailwind, tsx)
npx prisma migrate deploy     # إنشاء الجداول
npm run db:seed               # حساب المدير الأول
npm run build                 # بناء نسخة الإنتاج
```
ثم اضغط **Restart** في صفحة Setup Node.js App.

### 5) الدومين من Namecheap
- إن كانت الاستضافة تدير DNS: غيّر Nameservers في Namecheap إلى نيم سيرفرات الاستضافة (تجدها في رسالة الترحيب أو من مزود الاستضافة).
- أو أبقِ DNS عند Namecheap وأضف **A Record** يشير `@` و`www` إلى IP السيرفر (تجده في cPanel → General Information).
- فعّل شهادة SSL من cPanel (AutoSSL / Let's Encrypt) بعد ارتباط الدومين.

### ملاحظات مهمة للاستضافة المشتركة
- مجلد `public/uploads/` (الشعار والختم) يُخزَّن على قرص الاستضافة نفسه — ضمّنه في أي نسخ احتياطي.
- عند تحديث الكود لاحقاً: ارفع التغييرات ثم أعد `npm install --include=dev && npx prisma migrate deploy && npm run build` واضغط Restart.
- إن ظهر خطأ 503/الصفحة لا تفتح: راجع ملف `stderr.log` داخل مجلد التطبيق.

## البنية

- `prisma/schema.prisma` — نموذج البيانات الكامل (العملاء، الفنادق، المرشدون، السائقون، البرامج السياحية، الرحلات وحجوزاتها، القيود المحاسبية، الميزانية الافتتاحية، أوامر التكليف، الإعدادات). الجداول بترميز `utf8mb4` لدعم العربية بالكامل.
- `src/app/(app)/*` — كل صفحات النظام بعد تسجيل الدخول (محمية تلقائياً عبر `src/proxy.ts`).
- `src/components/ui.tsx` — مكوّنات الواجهة المشتركة (جداول، بطاقات، أزرار، نماذج).
- `server.js` — نقطة التشغيل على استضافة cPanel (Passenger).
- كل وحدة تستخدم Server Actions مباشرة (`actions.ts`) بدل واجهات API منفصلة.

## أوامر التكليف (PDF)

يتم توليد أمر التكليف من `src/app/(app)/task-orders/[id]/pdf/route.tsx` باستخدام خط Tajawal (`public/fonts/`) لدعم العربية. ارفع شعار الوكالة وختمها مرة واحدة من صفحة **الإعدادات** ليتم إدراجهما تلقائياً في كل أمر تكليف لاحق دون الحاجة للختم يدوياً.

> ملاحظة: محرك PDF المستخدم (`@react-pdf/renderer`) لا ينفّذ خوارزمية Unicode Bidi كاملة، لذلك تم تنسيق التواريخ بأرقام لاتينية ثابتة (DD/MM/YYYY) وفصل تسميات الحقول عن قيمها العربية/الرقمية لتفادي أي التباس في الاتجاه.
