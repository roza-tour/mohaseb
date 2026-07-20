import type { NextConfig } from "next";

// نثبّت المنطقة الزمنية على UTC لتشغيل التطوير و`next start` المحلي بنفس سلوك السيرفر.
process.env.TZ = "UTC";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
