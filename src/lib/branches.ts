// الفروع: الوكالة الأم وما يتفرّع عنها.
//
// الفاتورة تُصدَر باسم فرع، فتحمل ترويسته وبياناته وحسابه البنكي.
// الحقل الذي يُترك فارغاً في الفرع يرث قيمته من إعدادات الوكالة الأم،
// فيكفي أن يملأ الفرع ما يختلف فيه (الاسم والعنوان والهاتف مثلاً)
// دون إعادة إدخال كل شيء.
import type { Branch, Settings } from "@prisma/client";

// إعدادات ورق الشركة لهذا الفرع — بنية Settings نفسها ليقرأها قالب الترويسة
export function branchLetterhead(settings: Settings | null, branch: Branch | null): Settings | null {
  if (!branch || !settings) return settings;
  const pick = (branchValue: string, fallback: string) =>
    branchValue.trim() !== "" ? branchValue : fallback;

  return {
    ...settings,
    agencyName: pick(branch.name, settings.agencyName),
    agencyTagline: pick(branch.tagline, settings.agencyTagline),
    agencyAddress: pick(branch.address, settings.agencyAddress),
    agencyPhone: pick(branch.phone, settings.agencyPhone),
    agencyEmail: pick(branch.email, settings.agencyEmail),
    agencyWebsite: pick(branch.website, settings.agencyWebsite),
    agencyRC: pick(branch.rc, settings.agencyRC),
    logoPath: branch.logoPath ?? settings.logoPath,
    stampPath: branch.stampPath ?? settings.stampPath,
    letterheadColor: branch.letterheadColor?.trim() || settings.letterheadColor,
  };
}

// نص الحساب البنكي المعروض في الفاتورة:
// ما كُتب في الفاتورة نفسها، وإلا حساب الفرع، وإلا حساب الوكالة الأم.
export function bankDetailsText(
  invoiceBankDetails: string | null,
  branch: Branch | null,
  settings: Settings | null
): string {
  const invoiceOwn = invoiceBankDetails?.trim();
  if (invoiceOwn) return invoiceOwn;
  const branchOwn = branch?.bankDetails?.trim();
  if (branchOwn) return branchOwn;
  return settings?.bankDetails?.trim() ?? "";
}
