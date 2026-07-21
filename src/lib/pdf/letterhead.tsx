// قالب "ورق الشركة" الموحّد لكل مستندات PDF الصادرة من النظام،
// مطابق لورق روزا تور الرسمي: اللوغو أعلى يسار الصفحة، اسم الوكالة وسطرها
// الفرعي في المنتصف بالأزرق الداكن، وأسفل كل صفحة شريط أزرق سميك تحته
// العنوان وأرقام الهواتف والبريد الإلكتروني والموقع — تُدار كلها من صفحة الإعدادات.
import fs from "fs";
import path from "path";
import { Page, Text, View, Image, Font, StyleSheet } from "@react-pdf/renderer";
import type { Settings } from "@prisma/client";
import { MixedText } from "./MixedText";

const DEFAULT_COLOR = "#1f3864";

let fontsRegistered = false;
let displayFontAvailable = false;

export function registerArabicFonts() {
  if (fontsRegistered) return;
  Font.register({
    family: "Tajawal",
    fonts: [
      { src: path.join(process.cwd(), "public/fonts/Tajawal-Regular.ttf") },
      { src: path.join(process.cwd(), "public/fonts/Tajawal-Bold.ttf"), fontWeight: "bold" },
    ],
  });
  // خط عرض اختياري لاسم الوكالة وسطرها الفرعي في الترويسة (مثل خط Algerian)
  // يُفعَّل تلقائياً عند وضع الملف في public/fonts/agency-display.ttf
  try {
    const displayPath = path.join(process.cwd(), "public/fonts/agency-display.ttf");
    if (fs.existsSync(displayPath)) {
      Font.register({ family: "AgencyDisplay", fonts: [{ src: displayPath }] });
      displayFontAvailable = true;
    }
  } catch {
    /* نتجاهل ونستعمل الخط الافتراضي */
  }
  fontsRegistered = true;
}

// اسم خط الترويسة إن توفّر ملفه، وإلا undefined ليُستعمل الخط الافتراضي
export function agencyDisplayFont(): string | undefined {
  return displayFontAvailable ? "AgencyDisplay" : undefined;
}

export function loadPublicImage(publicRelativePath: string | null | undefined): Buffer | null {
  if (!publicRelativePath) return null;
  try {
    const full = path.join(process.cwd(), "public", publicRelativePath.replace(/^\//, ""));
    return fs.readFileSync(full);
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Tajawal",
    fontSize: 11,
    color: "#0f172a",
    paddingTop: 28,
    paddingHorizontal: 40,
    // مساحة محجوزة للتذييل الثابت حتى لا يتداخل معه المحتوى
    paddingBottom: 92,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  logoBox: {
    width: 95,
    alignItems: "flex-start",
  },
  logo: {
    height: 72,
    maxWidth: 95,
    objectFit: "contain",
  },
  nameBox: {
    flex: 1,
    alignItems: "center",
  },
  agencyName: {
    fontSize: 24,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  agencyTagline: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 4,
    letterSpacing: 0.5,
  },
  // عمود فارغ يوازن عرض اللوغو حتى يبقى الاسم في منتصف الصفحة تماماً
  headerSpacer: {
    width: 95,
  },
  // ختم الوكالة مستقل أعلى يمين الورقة بحجم طبيعي (لا يبدو مزيفاً)
  stampTopRight: {
    position: "absolute",
    top: 20,
    right: 34,
    width: 122,
    height: 122,
    objectFit: "contain",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
  },
  footerBar: {
    height: 5,
    marginBottom: 7,
  },
  footerCols: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    gap: 14,
  },
  footerColRight: {
    flex: 3,
  },
  footerColLeft: {
    flex: 2,
  },
  footerLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#1e293b",
  },
  footerText: {
    fontSize: 8,
    color: "#1e293b",
  },
  footerQr: {
    width: 44,
    height: 44,
    marginRight: 6,
  },
});

// سطر تذييل موحّد: التسمية على اليسار ثم القيمة بعدها مباشرةً.
// dir="ltr" للحقول اللاتينية (هاتف/بريد/موقع) حتى لا تنعكس الأرقام،
// و dir="auto" للعنوان العربي حتى يظهر باتجاهه الصحيح.
function FooterLine({
  label,
  value,
  dir = "ltr",
}: {
  label: string;
  value: string;
  dir?: "ltr" | "auto";
}) {
  return (
    <View style={{ flexDirection: "row", marginBottom: 2 }}>
      <Text style={styles.footerLabel}>{label} : </Text>
      <MixedText
        text={value}
        style={styles.footerText}
        size={8}
        align="left"
        baseDir={dir}
        containerStyle={{ flex: 1 }}
      />
    </View>
  );
}

function Footer({ settings, qr }: { settings: Settings | null; qr?: Buffer | null }) {
  const color = settings?.letterheadColor || DEFAULT_COLOR;
  const address = settings?.agencyAddress || "";
  const phone = settings?.agencyPhone || "";
  const email = settings?.agencyEmail || "";
  const website = settings?.agencyWebsite || "";

  return (
    <View style={styles.footer} fixed>
      <View style={[styles.footerBar, { backgroundColor: color }]} />
      <View style={styles.footerCols}>
        <View style={styles.footerColRight}>
          {address ? <FooterLine label="Adresse" value={address} dir="auto" /> : null}
          {email ? <FooterLine label="E-Mail" value={email} /> : null}
        </View>
        <View style={styles.footerColLeft}>
          {phone ? <FooterLine label="Tel" value={phone} /> : null}
          {website ? <FooterLine label="Web" value={website} /> : null}
        </View>
        {qr ? (
          // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image
          <Image src={qr} style={styles.footerQr} />
        ) : null}
      </View>
    </View>
  );
}

export function LetterheadPage({
  settings,
  children,
  stamp,
  qr,
}: {
  settings: Settings | null;
  children: React.ReactNode;
  // ختم الوكالة كصورة مستقلة (بدون مربع أو تسمية) أعلى يمين الورقة عند تمريره
  stamp?: Buffer | null;
  // رمز QR للمستند يظهر في التذييل عند تمريره
  qr?: Buffer | null;
}) {
  const logoBuffer = loadPublicImage(settings?.logoPath);
  const color = settings?.letterheadColor || DEFAULT_COLOR;
  const displayFont = agencyDisplayFont();

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header} fixed>
        <View style={styles.logoBox}>
          {logoBuffer ? (
            // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image, not an HTML img
            <Image src={logoBuffer} style={styles.logo} />
          ) : null}
        </View>
        <View style={styles.nameBox}>
          <Text
            style={[
              styles.agencyName,
              { color },
              // خط Algerian بحروف كبيرة فقط، فنحوّل النص إلى Uppercase عند تفعيله
              displayFont ? { fontFamily: displayFont, textTransform: "uppercase" } : {},
            ]}
          >
            {settings?.agencyName?.trim() || "ROZATOUR"}
          </Text>
          {settings?.agencyTagline ? (
            <Text
              style={[
                styles.agencyTagline,
                { color },
                displayFont ? { fontFamily: displayFont, textTransform: "uppercase" } : {},
              ]}
            >
              {settings.agencyTagline}
            </Text>
          ) : null}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {children}

      <Footer settings={settings} qr={qr} />

      {/* الختم يُرسم آخر عنصر (وثابت على كل صفحة) ليظهر فوق كل المحتوى ولا يغطّيه شيء */}
      {stamp ? (
        // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image, not an HTML img
        <Image src={stamp} style={styles.stampTopRight} fixed />
      ) : null}
    </Page>
  );
}
