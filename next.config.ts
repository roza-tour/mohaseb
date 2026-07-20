import type { NextConfig } from "next";

// نثبّت المنطقة الزمنية على UTC لتشغيل التطوير و`next start` المحلي بنفس سلوك السيرفر.
process.env.TZ = "UTC";

const nextConfig: NextConfig = {
  // الاستضافة المشتركة (CloudLinux) تحدّ عدد العمليات، فنقلّل عمّال البناء لعملية واحدة
  // حتى لا يفشل البناء بخطأ spawn EAGAIN عند تجهيز الصفحات
  experimental: {
    cpus: 1,
    workerThreads: false,
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
