// توليد ملف Excel بسيط من عناوين وصفوف لتصدير القوائم.
import ExcelJS from "exceljs";

export async function rowsToXlsx(
  sheetName: string,
  headers: string[],
  rows: (string | number)[][]
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName, { views: [{ rightToLeft: true }] });

  const head = ws.addRow(headers);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F3864" } };
    c.alignment = { horizontal: "center", vertical: "middle" };
  });

  rows.forEach((r) => ws.addRow(r));

  // عرض تلقائي تقريبي لكل عمود
  headers.forEach((h, i) => {
    let max = h.length;
    for (const r of rows) max = Math.max(max, String(r[i] ?? "").length);
    ws.getColumn(i + 1).width = Math.min(Math.max(max + 2, 10), 45);
  });

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export function xlsxResponseHeaders(filename: string) {
  return {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="${filename}"`,
  };
}
