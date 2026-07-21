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

export function registerArabicFonts() {
  if (fontsRegistered) return;
  Font.register({
    family: "Tajawal",
    fonts: [
      { src: path.join(process.cwd(), "public/fonts/Tajawal-Regular.ttf") },
      { src: path.join(process.cwd(), "public/fonts/Tajawal-Bold.ttf"), fontWeight: "bold" },
    ],
  });
  fontsRegistered = true;
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
});

function FooterLineRTL({ label, value }: { label: string; value: string }) {
  // التسمية في أقصى اليمين والقيمة تمتد لليسار وتلتف داخل عمودها،
  // كما في ورق الشركة الرسمي (محرك PDF لا يدعم خوارزمية bidi كاملة،
  // لذا نفصل التسمية عن القيمة في عنصرين داخل صف معكوس)
  return (
    <View style={{ flexDirection: "row-reverse", marginBottom: 2 }}>
      <Text style={styles.footerLabel}>{label} : </Text>
      <MixedText text={value} style={styles.footerText} size={8} containerStyle={{ flex: 1 }} />
    </View>
  );
}

function FooterLineLTR({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", marginBottom: 2 }}>
      <Text style={styles.footerLabel}>{label} : </Text>
      <Text style={[styles.footerText, { flex: 1, textAlign: "left" }]}>{value}</Text>
    </View>
  );
}

function Footer({ settings }: { settings: Settings | null }) {
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
          {address ? <FooterLineRTL label="Adresse" value={address} /> : null}
          {email ? <FooterLineLTR label="E-Mail" value={email} /> : null}
        </View>
        <View style={styles.footerColLeft}>
          {phone ? <FooterLineLTR label="Tel" value={phone} /> : null}
          {website ? <FooterLineLTR label="Web" value={website} /> : null}
        </View>
      </View>
    </View>
  );
}

export function LetterheadPage({
  settings,
  children,
}: {
  settings: Settings | null;
  children: React.ReactNode;
}) {
  const logoBuffer = loadPublicImage(settings?.logoPath);
  const color = settings?.letterheadColor || DEFAULT_COLOR;

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
          <Text style={[styles.agencyName, { color }]}>{settings?.agencyName?.trim() || "ROZATOUR"}</Text>
          {settings?.agencyTagline ? (
            <Text style={[styles.agencyTagline, { color }]}>{settings.agencyTagline}</Text>
          ) : null}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {children}

      <Footer settings={settings} />
    </Page>
  );
}
