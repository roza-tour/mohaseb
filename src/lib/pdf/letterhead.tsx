// قالب "ورق الشركة" الموحّد لكل مستندات PDF الصادرة من النظام:
// لوغو الوكالة أعلى الصفحة، وتذييل ثابت بخط رقيق أسفل كل صفحة يحوي
// العنوان وأرقام الهواتف والبريد الإلكتروني والموقع — تُدار كلها من صفحة الإعدادات.
import fs from "fs";
import path from "path";
import { Page, Text, View, Image, Font, StyleSheet } from "@react-pdf/renderer";
import type { Settings } from "@prisma/client";

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
    paddingTop: 30,
    paddingHorizontal: 40,
    // مساحة محجوزة للتذييل الثابت حتى لا يتداخل معه المحتوى
    paddingBottom: 80,
  },
  header: {
    alignItems: "center",
    marginBottom: 6,
  },
  logo: {
    height: 56,
    maxWidth: 180,
    objectFit: "contain",
    marginBottom: 6,
  },
  agencyName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#0f172a",
  },
  headerRule: {
    marginTop: 8,
    marginBottom: 14,
    borderBottom: "1.5px solid #0369a1",
  },
  footer: {
    position: "absolute",
    bottom: 26,
    left: 40,
    right: 40,
    borderTop: "0.75px solid #cbd5e1",
    paddingTop: 7,
  },
  footerRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  footerItem: {
    fontSize: 7.5,
    fontWeight: 300,
    color: "#64748b",
  },
  footerSep: {
    fontSize: 7.5,
    color: "#94a3b8",
    marginHorizontal: 6,
  },
});

function FooterItems({ settings }: { settings: Settings | null }) {
  // كل عنصر في <Text> مستقل داخل صف row-reverse لتفادي مشاكل اتجاه
  // الأرقام والروابط اللاتينية داخل النص العربي (محرك PDF لا يدعم bidi كاملاً)
  const items: string[] = [];
  if (settings?.agencyAddress) items.push(settings.agencyAddress);
  if (settings?.agencyPhone) items.push(settings.agencyPhone);
  if (settings?.agencyEmail) items.push(settings.agencyEmail);
  if (settings?.agencyWebsite) items.push(settings.agencyWebsite);

  if (items.length === 0) return null;

  return (
    <View style={styles.footerRow}>
      {items.map((item, i) => (
        <View key={i} style={{ flexDirection: "row-reverse" }}>
          {i > 0 ? <Text style={styles.footerSep}>•</Text> : null}
          <Text style={styles.footerItem}>{item}</Text>
        </View>
      ))}
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

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        {logoBuffer ? (
          // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image, not an HTML img
          <Image src={logoBuffer} style={styles.logo} />
        ) : null}
        <Text style={styles.agencyName}>{settings?.agencyName ?? "وكالة روزا تور السياحية"}</Text>
      </View>
      <View style={styles.headerRule} />

      {children}

      <View style={styles.footer} fixed>
        <FooterItems settings={settings} />
      </View>
    </Page>
  );
}
