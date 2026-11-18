"use server";

import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { requireUser } from "@/lib/authz";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { nextDocNumber } from "@/lib/docNumbers";
import { SALARY_STATEMENT, salaryBody, salaryTitle, type SalaryData } from "@/lib/salaryStatement";
import {
  WORK_CERTIFICATE,
  certDataFrom,
  certificateBody,
  certificateTitle,
  resolveSigner,
  SIGNER_ROLES,
} from "@/lib/workCertificate";

function str(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, 300) : "";
}

const orNull = (v: string) => (v ? v : null);

// تاريخ من خانة <input type="date"> — الفارغ أو غير الصالح = null
function date(formData: FormData, key: string): Date | null {
  const v = str(formData, key);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00Z`);
  return isNaN(d.getTime()) ? null : d;
}

// كل الخانات اختيارية — حتى الاسم
function buildEmployeeData(formData: FormData) {
  return {
    name: str(formData, "name"),
    gender: formData.get("gender") === "F" ? "F" : "M",
    birthDate: date(formData, "birthDate"),
    birthPlace: orNull(str(formData, "birthPlace")),
    idNumber: orNull(str(formData, "idNumber")),
    socialSecurityNo: orNull(str(formData, "socialSecurityNo")),
    jobTitle: orNull(str(formData, "jobTitle")),
    startDate: date(formData, "startDate"),
    endDate: date(formData, "endDate"),
    payType: ["salary", "commission", "both"].includes(str(formData, "payType")) ? str(formData, "payType") : "salary",
    baseSalary: amount(formData, "baseSalary") || null,
    commissionRate: amount(formData, "commissionRate") || null,
    notes: orNull(str(formData, "notes")),
  };
}

export async function createEmployee(formData: FormData) {
  await requireUser();
  const created = await prisma.employee.create({ data: buildEmployeeData(formData) });
  await logActivity("create", "Employee", created.name || "موظف بلا اسم");
  revalidatePath("/employees");
  redirect(`/employees/${created.id}`);
}

export async function updateEmployee(id: string, formData: FormData) {
  await requireUser();
  await prisma.employee.update({ where: { id }, data: buildEmployeeData(formData) });
  revalidatePath("/employees");
  redirect(`/employees/${id}?saved=1`);
}

export async function deleteEmployee(id: string) {
  await requireUser();
  const removed = await prisma.employee.delete({ where: { id } });
  await logActivity("delete", "Employee", removed.name || "موظف بلا اسم");
  revalidatePath("/employees");
  redirect("/employees");
}

// الموقّع (الاسم بالعربية/الفرنسية والصفة) من النموذج — يُحفظ في الإعدادات للمرة القادمة
async function readSigner(formData: FormData, lang: "ar" | "fr") {
  // اسم الموقّع بلغة المستند (بالعربية أو بالحروف اللاتينية) — وإن لم يُكتب نأخذ الآخر
  const signerNameAr = str(formData, "signerName");
  const signerNameFr = str(formData, "signerNameFr");
  const signerName = lang === "ar" ? signerNameAr || signerNameFr : signerNameFr || signerNameAr;
  // صفة الموقّع: اختيار جاهز (المالك، المسيّر...) أو نص حر
  const signerKey = str(formData, "signerRole");
  const signerCustom = str(formData, "signerTitleCustom");
  const signer = resolveSigner(signerKey, signerCustom, lang);
  const savedTitle = SIGNER_ROLES[signerKey] ? signerKey : signerCustom;

  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    create: { id: 1, managerName: signerNameAr, managerNameFr: signerNameFr, managerTitle: savedTitle },
    update: { managerName: signerNameAr, managerNameFr: signerNameFr, managerTitle: savedTitle },
  });
  return { settings, signerName, signer };
}

// مبلغ من النموذج — الفارغ أو غير الصالح = 0
function amount(formData: FormData, key: string): number {
  const n = Number(str(formData, key).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// إصدار شهادة عمل: تُحفظ مستنداً صادراً (رقم تسلسلي + ختم + QR) ثم يُفتح الـ PDF.
// الموقّع والمدينة يُحفظان في الإعدادات ليُملآ تلقائياً في الشهادة التالية.
export async function issueWorkCertificate(id: string, formData: FormData) {
  await requireUser();
  const emp = await prisma.employee.findUnique({ where: { id } });
  if (!emp) redirect("/employees");

  const lang = formData.get("lang") === "ar" ? "ar" : "fr";
  const docDate = date(formData, "docDate") ?? new Date();
  const { settings, signerName, signer } = await readSigner(formData, lang);

  const agencyName = settings.agencyName || "ROZATOUR";
  const data = certDataFrom(emp, {
    lang,
    agencyName,
    agencyAddress: settings.agencyAddress,
    signerName,
    signerTitle: signer.title,
    signerRole: signer.role,
    signerGender: signer.gender,
    // مكان التحرير صار من الإعدادات (يُكتب مع التاريخ في رأس الشهادة)
    city: "",
    date: docDate,
  });
  const body = certificateBody(data, { agencyName, agencyAddress: settings.agencyAddress, date: docDate });

  const docNumber = await nextDocNumber("document", docDate.getUTCFullYear());
  const doc = await prisma.document.create({
    data: {
      docNumber,
      title: certificateTitle(lang).main,
      body,
      docDate,
      kind: WORK_CERTIFICATE,
      data,
      showStamp: formData.get("showStamp") === "on",
    },
  });
  await logActivity("create", "Document", `شهادة عمل ${docNumber} — ${emp.name || "موظف"}`);
  revalidatePath("/documents");
  redirect(`/documents/${doc.id}/pdf`);
}

// إصدار بيان راتب لشهر معيّن: بنفس تصميم شهادة العمل، ويُحفظ مستنداً صادراً
export async function issueSalaryStatement(id: string, formData: FormData) {
  await requireUser();
  const emp = await prisma.employee.findUnique({ where: { id } });
  if (!emp) redirect("/employees");

  const lang = formData.get("lang") === "ar" ? "ar" : "fr";
  const docDate = date(formData, "docDate") ?? new Date();
  const p = str(formData, "period");
  const period = /^\d{4}-\d{2}$/.test(p) ? p : docDate.toISOString().slice(0, 7);
  const { settings, signerName, signer } = await readSigner(formData, lang);
  const agencyName = settings.agencyName || "ROZATOUR";

  const data: SalaryData = {
    lang,
    period,
    employee: {
      name: emp.name.trim(),
      gender: emp.gender === "F" ? "F" : "M",
      jobTitle: emp.jobTitle?.trim() ?? "",
      idNumber: emp.idNumber?.trim() ?? "",
      socialSecurityNo: emp.socialSecurityNo?.trim() ?? "",
      startDate: emp.startDate?.toISOString() ?? null,
    },
    payType: emp.payType,
    baseSalary: emp.baseSalary ?? 0,
    commissionRate: emp.commissionRate ?? 0,
    commissionBase: amount(formData, "commissionBase"),
    bonus: amount(formData, "bonus"),
    deductions: amount(formData, "deductions"),
    currency: settings.defaultCurrency || "DZD",
    signerName,
    signerTitle: signer.title,
    signerRole: signer.role,
    signerGender: signer.gender,
  };
  const body = salaryBody(data, { agencyName, agencyAddress: settings.agencyAddress });

  const docNumber = await nextDocNumber("document", docDate.getUTCFullYear());
  const doc = await prisma.document.create({
    data: {
      docNumber,
      title: salaryTitle(lang),
      body,
      docDate,
      kind: SALARY_STATEMENT,
      data,
      showStamp: formData.get("showStamp") === "on",
    },
  });
  await logActivity("create", "Document", `بيان راتب ${docNumber} — ${emp.name || "موظف"} — ${period}`);
  revalidatePath("/documents");
  redirect(`/documents/${doc.id}/pdf`);
}
