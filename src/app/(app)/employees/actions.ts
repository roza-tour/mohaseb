"use server";

import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { requireUser } from "@/lib/authz";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { nextDocNumber } from "@/lib/docNumbers";
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

// إصدار شهادة عمل: تُحفظ مستنداً صادراً (رقم تسلسلي + ختم + QR) ثم يُفتح الـ PDF.
// الموقّع والمدينة يُحفظان في الإعدادات ليُملآ تلقائياً في الشهادة التالية.
export async function issueWorkCertificate(id: string, formData: FormData) {
  await requireUser();
  const emp = await prisma.employee.findUnique({ where: { id } });
  if (!emp) redirect("/employees");

  const lang = formData.get("lang") === "ar" ? "ar" : "fr";
  // اسم الموقّع بلغة الشهادة (بالعربية أو بالحروف اللاتينية) — وإن لم يُكتب نأخذ الآخر
  const signerNameAr = str(formData, "signerName");
  const signerNameFr = str(formData, "signerNameFr");
  const signerName = lang === "ar" ? signerNameAr || signerNameFr : signerNameFr || signerNameAr;
  // صفة الموقّع: اختيار جاهز (المالك، المسيّر...) أو نص حر
  const signerKey = str(formData, "signerRole");
  const signerCustom = str(formData, "signerTitleCustom");
  const signer = resolveSigner(signerKey, signerCustom, lang);
  const savedTitle = SIGNER_ROLES[signerKey] ? signerKey : signerCustom;
  const city = str(formData, "city");
  const docDate = date(formData, "docDate") ?? new Date();

  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      managerName: signerNameAr,
      managerNameFr: signerNameFr,
      managerTitle: savedTitle,
      agencyCity: city,
    },
    update: { managerName: signerNameAr, managerNameFr: signerNameFr, managerTitle: savedTitle, agencyCity: city },
  });

  const agencyName = settings.agencyName || "ROZATOUR";
  const data = certDataFrom(emp, {
    lang,
    agencyName,
    agencyAddress: settings.agencyAddress,
    signerName,
    signerTitle: signer.title,
    signerRole: signer.role,
    signerGender: signer.gender,
    city,
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
