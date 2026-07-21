// توليد ملفَي الفيزا الصحراوية الرسميين:
//  1) قائمة طالبي الفيزا (Excel) بنفس تخطيط نموذج مديرية السياحة
//  2) البرنامج المفصل (Word) بتعبئة قالب المديرية الأصلي نفسه
import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import type { Settings, VisaApplication, VisaTraveler } from "@prisma/client";

export function fmtFr(date: Date | null | undefined): string {
  if (!date) return "";
  // التواريخ مخزَّنة عند منتصف ليل UTC — نقرأها UTC حتى لا ينزاح اليوم على سيرفر بمنطقة زمنية مختلفة
  const d = String(date.getUTCDate()).padStart(2, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${d}/${m}/${date.getUTCFullYear()}`;
}

type App = VisaApplication & { travelers: VisaTraveler[] };

// ---------- Excel: Liste des demandeurs de visas ----------
export async function buildVisaExcel(app: App, settings: Settings | null): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Feuil1", {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  // عرض الأعمدة
  const widths: Record<string, number> = {
    A: 3, B: 9, C: 16, D: 16, E: 14, F: 16, G: 16, H: 15, I: 16, J: 14, K: 14, L: 13, M: 12, N: 14, O: 14,
  };
  for (const [col, w] of Object.entries(widths)) ws.getColumn(col).width = w;

  const thin = { style: "thin" as const };
  const boxBorder = { top: thin, left: thin, bottom: thin, right: thin };

  // الترويسة الرسمية
  ws.mergeCells("B7:O7");
  const head = ws.getCell("B7");
  head.value = `Direction du Tourisme et de l'Artisanat de la Wilaya de ${app.wilaya}`;
  head.font = { name: "Times New Roman", size: 13, bold: true, underline: true };
  head.alignment = { horizontal: "center" };

  ws.mergeCells("B9:O9");
  const title = ws.getCell("B9");
  title.value = "Listes des demandeurs de visas de régularisation";
  title.font = { name: "Times New Roman", size: 14, bold: true };
  title.alignment = { horizontal: "center" };

  // بيانات الوكالة
  const agencyRows: [string, string][] = [
    ["ATV", settings?.agencyName ?? ""],
    ["Siège social", settings?.agencyAddress ?? ""],
    ["N° RC", settings?.agencyRC ?? ""],
  ];
  agencyRows.forEach(([label, value], i) => {
    const row = 12 + i;
    const lc = ws.getCell(`C${row}`);
    lc.value = label;
    lc.font = { name: "Times New Roman", size: 11, bold: true };
    lc.border = boxBorder;
    ws.mergeCells(`D${row}:G${row}`);
    const vc = ws.getCell(`D${row}`);
    vc.value = value;
    vc.font = { name: "Times New Roman", size: 11 };
    vc.border = boxBorder;
  });

  // رؤوس المجموعات
  const groupFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFDDEBF7" } };
  ws.mergeCells("C17:G17");
  ws.mergeCells("H17:L17");
  ws.mergeCells("M17:O17");
  for (const [cell, label] of [
    ["C17", "Etat Civil"],
    ["H17", "Passeport"],
    ["M17", "Visa antérieur"],
  ] as const) {
    const c = ws.getCell(cell);
    c.value = label;
    c.font = { name: "Times New Roman", size: 11, bold: true };
    c.alignment = { horizontal: "center" };
    c.fill = groupFill;
    c.border = boxBorder;
  }
  ws.getCell("B17").border = boxBorder;

  // رأس الجدول
  const headers: [string, string][] = [
    ["B", "N° d'ordre"],
    ["C", "Nom"],
    ["D", "Prénom"],
    ["E", "Date de Naissance"],
    ["F", "Lieu de Naissance"],
    ["G", "Lieu de résidence"],
    ["H", "type de passeport"],
    ["I", "numéro de Passeport"],
    ["J", "Date de délivrence"],
    ["K", "Date d'expiration"],
    ["L", "Nationalité"],
    ["M", "Visa attribué"],
    ["N", "Date d'émission"],
    ["O", "Date d'expiration"],
  ];
  for (const [col, label] of headers) {
    const c = ws.getCell(`${col}18`);
    c.value = label;
    c.font = { name: "Times New Roman", size: 10, bold: true };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    c.fill = groupFill;
    c.border = boxBorder;
  }
  ws.getRow(18).height = 30;

  // صفوف المسافرين
  app.travelers.forEach((t, i) => {
    const row = 19 + i;
    const values: Record<string, string | number> = {
      B: i + 1,
      C: t.nom,
      D: t.prenom,
      E: fmtFr(t.dateNaissance),
      F: t.lieuNaissance,
      G: t.lieuResidence,
      H: t.typePasseport,
      I: t.numeroPasseport,
      J: fmtFr(t.dateDelivrance),
      K: fmtFr(t.dateExpiration),
      L: t.nationalite,
      M: t.visaAnterieur ? "Oui" : "Non",
      N: fmtFr(t.visaEmission),
      O: fmtFr(t.visaExpirationA),
    };
    for (const [col, v] of Object.entries(values)) {
      const c = ws.getCell(`${col}${row}`);
      c.value = v;
      c.font = { name: "Times New Roman", size: 10 };
      c.alignment = { horizontal: "center", vertical: "middle" };
      c.border = boxBorder;
    }
  });

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

// ---------- Word: Programme détaillé ----------
export function buildVisaWord(app: App): Buffer {
  const templatePath = path.join(process.cwd(), "templates", "programme-template.docx");
  const zip = new PizZip(fs.readFileSync(templatePath));
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true, // يحول أسطر البرنامج إلى أسطر فعلية داخل الوورد
    delimiters: { start: "{", end: "}" },
  });

  const nights = Math.max(
    Math.round((app.departureDate.getTime() - app.arrivalDate.getTime()) / 86400000),
    0
  );

  doc.render({
    WILAYA: app.wilaya,
    ARRIVEE: fmtFr(app.arrivalDate),
    DEPART: fmtFr(app.departureDate),
    WILAYAS: app.wilayasConcernees,
    NB_TOURISTES: String(app.travelers.length),
    DUREE: `${nights + 1} jours / ${nights} nuits`,
    PROGRAMME: app.programDetail,
  });

  return doc.getZip().generate({ type: "nodebuffer" });
}
