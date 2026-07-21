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

// ألوان النموذج الرسمي المستخرجة من ملف المديرية الأصلي (.xls)
const TITLE_GREEN = "FF339966"; // نص العناوين (أخضر)
const HDR_YELLOW = "FFFFFF99"; // تعبئة رؤوس المجموعات والأعمدة (أصفر فاتح)
const ATV_PEACH = "FFFFCC99"; // تعبئة خانات بيانات الوكالة (خوخي)

// ---------- Excel: Liste des demandeurs de visas ----------
// نقطة الدخول: إن وُجد النموذج الرسمي الأصلي (xlsx) نملأه كما هو مع الحفاظ على
// شكله وشعاره وألوانه بالكامل؛ وإلا نُعيد بناء النموذج بأقرب شكل ممكن.
export async function buildVisaExcel(app: App, settings: Settings | null): Promise<Buffer> {
  const templatePath = path.join(process.cwd(), "templates", "assets", "visa-list-template.xlsx");
  if (fs.existsSync(templatePath)) {
    try {
      return await fillVisaExcelTemplate(templatePath, app, settings);
    } catch {
      // لو تعذّر ملء النموذج الأصلي لأي سبب نرجع للبناء الاحتياطي بدل تعطيل التصدير
    }
  }
  return buildVisaExcelFromScratch(app, settings);
}

// ملء النموذج الرسمي الأصلي: نكتب القيم فقط في مواضعها ونترك كل التنسيق والشعار كما هو.
async function fillVisaExcelTemplate(
  templatePath: string,
  app: App,
  settings: Settings | null
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(templatePath);
  const ws = wb.worksheets[0];

  // إخفاء خطوط الشبكة حتى تبقى الورقة نظيفة كالنموذج الرسمي (تظهر فقط حدود الجدول)
  ws.views = [{ showGridLines: false }];

  // إعادة ضبط ألوان النموذج الرسمي كما في الأصل الحكومي (الصورة):
  // العناوين برتقالية، خانات بيانات الوكالة وردية، ورؤوس الجدول خوخية فاتحة.
  const OFF_ORANGE = "FFE36C0A"; // نص العناوين
  const OFF_PINK = "FFD9A9A9"; // خانات قيم الوكالة
  const OFF_PEACH = "FFFCE4D6"; // رؤوس المجموعات والأعمدة
  const setFont = (addr: string, argb: string) => {
    const c = ws.getCell(addr);
    c.font = { ...(c.font ?? {}), color: { argb } };
  };
  const setFill = (addr: string, argb: string) => {
    ws.getCell(addr).fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
  };
  // عناوين برتقالية
  ["B7", "F9"].forEach((a) => setFont(a, OFF_ORANGE));
  // قيم بيانات الوكالة وردية (D:E مدمجة)
  ["D12", "E12", "D13", "E13", "D14", "E14"].forEach((a) => setFill(a, OFF_PINK));
  // رؤوس المجموعات (صف 17) ورؤوس الأعمدة (صف 18) خوخية فاتحة
  const H = ["B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O"];
  H.forEach((col) => {
    setFill(`${col}17`, OFF_PEACH);
    setFill(`${col}18`, OFF_PEACH);
  });

  // عنوان الولاية أعلى النموذج (نحافظ على صياغة المديرية الرسمية)
  ws.getCell("B7").value = `Direction du Tourisme et de l'Artisanat de la Wilaya de ${app.wilaya ?? ""}`;

  // بيانات الوكالة (القيم مدمجة D:E) — نُصغّر النص تلقائياً ليتّسع داخل الخانة (shrinkToFit)
  const agencyVals: [string, string][] = [
    ["D12", settings?.agencyName ?? ""],
    ["D13", settings?.agencyAddress ?? ""],
    ["D14", settings?.agencyRC ?? ""],
  ];
  for (const [addr, val] of agencyVals) {
    const c = ws.getCell(addr);
    c.value = val;
    c.alignment = { ...(c.alignment ?? {}), shrinkToFit: true };
  }

  // صفوف المسافرين تبدأ من الصف 19 (نكتب القيم فقط؛ الإطارات والخطوط موجودة في النموذج)
  app.travelers.forEach((t, i) => {
    const r = 19 + i;
    const set = (col: string, v: string | number) => {
      ws.getCell(`${col}${r}`).value = v;
    };
    set("B", i + 1);
    set("C", t.nom);
    set("D", t.prenom);
    set("E", fmtFr(t.dateNaissance));
    set("F", t.lieuNaissance);
    set("G", t.lieuResidence);
    set("H", t.typePasseport);
    set("I", t.numeroPasseport);
    set("J", fmtFr(t.dateDelivrance));
    set("K", fmtFr(t.dateExpiration));
    set("L", t.nationalite);
    // خانات «الفيزا السابقة» تبقى فارغة إن لم توجد فيزا سابقة (لا نكتب Non)
    set("M", t.visaAnterieur ? "Oui" : "");
    set("N", fmtFr(t.visaEmission));
    set("O", fmtFr(t.visaExpirationA));
  });

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

// النسخة الاحتياطية: بناء النموذج من الصفر بأقرب شكل للنموذج الرسمي.
async function buildVisaExcelFromScratch(app: App, settings: Settings | null): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Feuil1", {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 } },
  });

  // عرض الأعمدة — نفس قيم النموذج الأصلي (عرض الحرف)
  const widths: Record<string, number> = {
    A: 4.86, B: 8, C: 14.14, D: 13.71, E: 16.71, F: 20, G: 18.29, H: 20.86,
    I: 10, J: 10, K: 12.71, L: 15, M: 14.86, N: 13.86, O: 13,
  };
  for (const [col, w] of Object.entries(widths)) ws.getColumn(col).width = w;

  // ارتفاع الصفوف — مطابق للنموذج الأصلي (نقاط)
  const rowHeights: Record<number, number> = {
    1: 15, 2: 15, 3: 15, 4: 15.75, 5: 15, 6: 63.75, 7: 20.25, 9: 20.25,
    12: 27.75, 13: 27.75, 14: 28.5, 17: 18.75, 18: 30,
  };
  for (const [r, h] of Object.entries(rowHeights)) ws.getRow(Number(r)).height = h;

  const thin = { style: "thin" as const };
  const boxBorder = { top: thin, left: thin, bottom: thin, right: thin };
  const fill = (argb: string) =>
    ({ type: "pattern" as const, pattern: "solid" as const, fgColor: { argb } });

  // شعار الدولة (وزارة السياحة والصناعة التقليدية) في المساحة المدمجة أعلى النموذج B1:O6
  ws.mergeCells("B1:O6");
  try {
    const emblemPath = path.join(process.cwd(), "templates", "assets", "visa-emblem.jpg");
    const imgId = wb.addImage({ buffer: fs.readFileSync(emblemPath) as unknown as ExcelJS.Buffer, extension: "jpeg" });
    // مربّع ~140px موسّط داخل مساحة الترويسة العريضة B1:O6
    // (بداية العمود H تقع تقريباً عند منتصف النطاق B..O فيصبح الشعار موسّطاً)
    ws.addImage(imgId, {
      tl: { col: 7, row: 1 },
      ext: { width: 140, height: 140 },
      editAs: "oneCell",
    });
  } catch {
    // إن تعذّر تحميل الشعار لأي سبب نُكمل بدونه بدل تعطيل الملف كله
  }

  // العنوان الأول: مديرية السياحة والصناعة التقليدية للولاية
  ws.mergeCells("B7:O7");
  const head = ws.getCell("B7");
  head.value = `Direction du Tourisme et de l'Artisanat de la Wilaya de ${app.wilaya ?? ""}`;
  head.font = { name: "Times New Roman", size: 16, bold: true, color: { argb: TITLE_GREEN } };
  head.alignment = { horizontal: "center", vertical: "middle" };

  // العنوان الثاني: قائمة طالبي فيزا التسوية (مدمج F9:K9 كما في الأصل)
  ws.mergeCells("F9:K9");
  const title = ws.getCell("F9");
  title.value = "Listes des demandeurs de visas de régularisation";
  title.font = { name: "Times New Roman", size: 16, bold: true, color: { argb: TITLE_GREEN } };
  title.alignment = { horizontal: "center", vertical: "middle" };

  // بيانات الوكالة (خانات خوخية مؤطّرة) — القيمة مدمجة D:E
  const agencyRows: [string, string][] = [
    ["ATV", settings?.agencyName ?? ""],
    ["Siège social", settings?.agencyAddress ?? ""],
    ["N° RC", settings?.agencyRC ?? ""],
  ];
  agencyRows.forEach(([label, value], i) => {
    const row = 12 + i;
    const lc = ws.getCell(`C${row}`);
    lc.value = label;
    lc.font = { name: "Times New Roman", size: 12, bold: true };
    lc.alignment = { horizontal: "center", vertical: "middle" };
    lc.fill = fill(ATV_PEACH);
    lc.border = boxBorder;
    ws.mergeCells(`D${row}:E${row}`);
    const vc = ws.getCell(`D${row}`);
    vc.value = value;
    vc.font = { name: "Times New Roman", size: 12 };
    vc.alignment = { horizontal: "center", vertical: "middle" };
    vc.fill = fill(ATV_PEACH);
    vc.border = boxBorder;
    ws.getCell(`E${row}`).border = boxBorder;
  });

  // رؤوس المجموعات (صف 17): Etat Civil / Passeport / Visa antérieur — تعبئة صفراء
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
    c.font = { name: "Times New Roman", size: 14, bold: true };
    c.alignment = { horizontal: "center", vertical: "middle" };
    c.fill = fill(HDR_YELLOW);
    c.border = boxBorder;
  }
  // خلية B17 (فوق «N° d'ordre») صفراء مؤطّرة كما في الأصل
  const b17 = ws.getCell("B17");
  b17.fill = fill(HDR_YELLOW);
  b17.border = boxBorder;
  // إطار بقية خلايا صف المجموعات المدمجة
  for (const col of ["D", "E", "F", "G", "I", "J", "K", "L", "N", "O"]) {
    ws.getCell(`${col}17`).border = boxBorder;
  }

  // رأس الجدول (صف 18) — نصوص مطابقة للنموذج الأصلي حرفياً (بما فيها أخطاؤه الإملائية)
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
    ["K", "Date d'expiration "],
    ["L", "Nationalié"],
    ["M", "Visa attribué"],
    ["N", "Date d'émission"],
    ["O", "Date d'expiration"],
  ];
  for (const [col, label] of headers) {
    const c = ws.getCell(`${col}18`);
    c.value = label;
    c.font = { name: "Times New Roman", size: 11, bold: true };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    c.fill = fill(HDR_YELLOW);
    c.border = boxBorder;
  }

  // صفوف المسافرين — مؤطّرة ومرقّمة تسلسلياً
  const cols = ["B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O"];
  app.travelers.forEach((t, i) => {
    const row = 19 + i;
    ws.getRow(row).height = 15;
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
      M: t.visaAnterieur ? "Oui" : "",
      N: fmtFr(t.visaEmission),
      O: fmtFr(t.visaExpirationA),
    };
    for (const col of cols) {
      const c = ws.getCell(`${col}${row}`);
      c.value = values[col] ?? "";
      c.font = { name: "Times New Roman", size: 11 };
      c.alignment = { horizontal: "center", vertical: "middle" };
      c.border = boxBorder;
    }
  });

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

// أبعاد صورة PNG من ترويسة IHDR (العرض عند الإزاحة 16، الارتفاع عند 20)
function pngSize(buf: Buffer): { w: number; h: number } {
  try {
    if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) {
      return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
    }
  } catch {
    /* تجاهل */
  }
  return { w: 1, h: 1 };
}

// إدراج ختم الوكالة كصورة مضمّنة في أسفل ملف البرنامج (بدون وحدات إضافية)
function injectStamp(zip: PizZip, stamp: Buffer) {
  // 1) نضيف صورة الختم إلى وسائط المستند
  zip.file("word/media/cachet_agency.png", stamp);

  // 2) نضيف علاقة للصورة في document.xml.rels
  const relsPath = "word/_rels/document.xml.rels";
  const relsFile = zip.file(relsPath);
  if (!relsFile) return;
  let rels = relsFile.asText();
  const relId = "rIdCachetAgency";
  if (!rels.includes(relId)) {
    rels = rels.replace(
      "</Relationships>",
      `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/cachet_agency.png"/></Relationships>`
    );
    zip.file(relsPath, rels);
  }

  // 3) نتأكد أن نوع محتوى png معرّف
  const ctPath = "[Content_Types].xml";
  const ctFile = zip.file(ctPath);
  if (ctFile) {
    let ct = ctFile.asText();
    if (!/Extension="png"/i.test(ct)) {
      ct = ct.replace("</Types>", '<Default Extension="png" ContentType="image/png"/></Types>');
      zip.file(ctPath, ct);
    }
  }

  // 4) الختم كصورة عائمة أعلى يمين الصفحة فوق النصوص (لا يزيح تخطيط المستند)
  const docPath = "word/document.xml";
  const docFile = zip.file(docPath);
  if (!docFile) return;
  let xml = docFile.asText();
  const { w, h } = pngSize(stamp);
  const maxEmu = 1260000; // ~3.3 سم كحد أقصى (حجم طبيعي للختم)
  const scale = maxEmu / Math.max(w, h);
  const cx = Math.round(w * scale);
  const cy = Math.round(h * scale);
  const A = "http://schemas.openxmlformats.org/drawingml/2006/main";
  const PIC = "http://schemas.openxmlformats.org/drawingml/2006/picture";
  // مرساة عائمة: يمين الهامش، أعلى الهامش، أمام النص (behindDoc=0) بلا التفاف
  const run =
    `<w:r><w:rPr><w:noProof/></w:rPr><w:drawing>` +
    `<wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="251680000" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1">` +
    `<wp:simplePos x="0" y="0"/>` +
    `<wp:positionH relativeFrom="margin"><wp:align>right</wp:align></wp:positionH>` +
    `<wp:positionV relativeFrom="margin"><wp:posOffset>0</wp:posOffset></wp:positionV>` +
    `<wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/>` +
    `<wp:docPr id="778" name="CachetTop"/>` +
    `<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="${A}" noChangeAspect="1"/></wp:cNvGraphicFramePr>` +
    `<a:graphic xmlns:a="${A}"><a:graphicData uri="${PIC}">` +
    `<pic:pic xmlns:pic="${PIC}">` +
    `<pic:nvPicPr><pic:cNvPr id="778" name="CachetTop"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="rIdCachetAgency"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
    `</pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
  // ندرج المرساة داخل أول فقرة في الجسم (قبل أول </w:p>) حتى لا نضيف سطراً جديداً
  const bodyIdx = xml.indexOf("<w:body>");
  const firstPClose = bodyIdx !== -1 ? xml.indexOf("</w:p>", bodyIdx) : -1;
  if (firstPClose !== -1) {
    xml = xml.slice(0, firstPClose) + run + xml.slice(firstPClose);
    zip.file(docPath, xml);
  }
}

// ---------- Word: Programme détaillé ----------
export function buildVisaWord(app: App, stamp?: Buffer | null): Buffer {
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

  const outZip = doc.getZip();
  if (stamp && stamp.length) {
    try {
      injectStamp(outZip, stamp);
    } catch {
      // لو تعذّر إدراج الختم لأي سبب نُصدر الملف بدونه بدل تعطيله
    }
  }
  return outZip.generate({ type: "nodebuffer" });
}
