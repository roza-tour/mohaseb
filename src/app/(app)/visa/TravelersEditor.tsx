"use client";

// محرر مسافري طلب الفيزا: صفوف ديناميكية + قراءة تلقائية لصورة الجواز
// (شريط MRZ أسفل الجواز) عبر tesseract.js داخل المتصفح — بدون رفع الصورة لأي خادم
import { useRef, useState } from "react";
import { scanPassport as ocrPassport } from "@/lib/passportScan";

type Traveler = {
  nom: string;
  prenom: string;
  naissance: string;
  lieuNaissance: string;
  residence: string;
  type: string;
  numero: string;
  delivrance: string;
  expiration: string;
  nationalite: string;
  visaAnterieur: boolean;
};

const empty: Traveler = {
  nom: "",
  prenom: "",
  naissance: "",
  lieuNaissance: "",
  residence: "",
  type: "Passeport ordinaire",
  numero: "",
  delivrance: "",
  expiration: "",
  nationalite: "",
  visaAnterieur: false,
};

const PASSPORT_TYPES = [
  "Passeport ordinaire",
  "Passeport temporaire",
  "Passeport diplomatique",
  "Passeport de service",
];

export function TravelersEditor() {
  const [rows, setRows] = useState<Traveler[]>([{ ...empty }]);
  const [scanning, setScanning] = useState<number | null>(null);
  const [scanMsg, setScanMsg] = useState("");
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  const update = (i: number, patch: Partial<Traveler>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const scanPassport = async (i: number, file: File) => {
    setScanning(i);
    setScanMsg("جارٍ قراءة الجواز... (قد تستغرق 10-20 ثانية أول مرة)");
    try {
      const parsed = await ocrPassport(file);
      if (parsed) {
        update(i, parsed);
        setScanMsg("✅ تمت قراءة الجواز — راجع البيانات وأكمل الحقول الناقصة (مكان الميلاد، تاريخ الإصدار...)");
      } else {
        setScanMsg("⚠️ لم أتمكن من قراءة شريط MRZ — تأكد أن الصورة واضحة ويظهر فيها السطران أسفل الجواز كاملين، أو أدخل البيانات يدوياً");
      }
    } catch {
      setScanMsg("⚠️ تعذرت القراءة التلقائية — أدخل البيانات يدوياً");
    } finally {
      setScanning(null);
    }
  };

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500";
  const labelCls = "block text-xs font-medium text-slate-600 mb-0.5";

  return (
    <div className="space-y-4">
      {scanMsg && (
        <p className="text-xs rounded-lg bg-sky-50 border border-sky-100 px-3 py-2 text-slate-700">{scanMsg}</p>
      )}

      {rows.map((t, i) => (
        <div key={i} className="rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="font-bold text-sm text-slate-700">المسافر {i + 1}</p>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                ref={(el) => {
                  fileRefs.current[i] = el;
                }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) scanPassport(i, f);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileRefs.current[i]?.click()}
                disabled={scanning !== null}
                className="text-xs rounded-lg bg-sky-600 text-white px-3 py-1.5 hover:bg-sky-700 disabled:opacity-50"
              >
                {scanning === i ? "⏳ جارٍ القراءة..." : "📷 مسح الجواز (تعبئة تلقائية)"}
              </button>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-red-500 hover:text-red-700 text-lg leading-none"
                  aria-label="حذف المسافر"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <div>
              <label className={labelCls}>Nom (اللقب)</label>
              <input name="t_nom" value={t.nom} onChange={(e) => update(i, { nom: e.target.value })} className={inputCls} dir="ltr" />
            </div>
            <div>
              <label className={labelCls}>Prénom (الاسم)</label>
              <input name="t_prenom" value={t.prenom} onChange={(e) => update(i, { prenom: e.target.value })} className={inputCls} dir="ltr" />
            </div>
            <div>
              <label className={labelCls}>تاريخ الميلاد</label>
              <input type="date" name="t_naissance" value={t.naissance} onChange={(e) => update(i, { naissance: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>مكان الميلاد</label>
              <input name="t_lieuNaissance" value={t.lieuNaissance} onChange={(e) => update(i, { lieuNaissance: e.target.value })} className={inputCls} dir="ltr" />
            </div>
            <div>
              <label className={labelCls}>مكان الإقامة</label>
              <input name="t_residence" value={t.residence} onChange={(e) => update(i, { residence: e.target.value })} className={inputCls} dir="ltr" />
            </div>
            <div>
              <label className={labelCls}>نوع الجواز</label>
              <select name="t_type" value={t.type} onChange={(e) => update(i, { type: e.target.value })} className={inputCls + " bg-white"}>
                {PASSPORT_TYPES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>رقم الجواز</label>
              <input name="t_numero" value={t.numero} onChange={(e) => update(i, { numero: e.target.value })} className={inputCls} dir="ltr" />
            </div>
            <div>
              <label className={labelCls}>تاريخ إصدار الجواز</label>
              <input type="date" name="t_delivrance" value={t.delivrance} onChange={(e) => update(i, { delivrance: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>تاريخ انتهاء الجواز</label>
              <input type="date" name="t_expiration" value={t.expiration} onChange={(e) => update(i, { expiration: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>الجنسية (بالفرنسية)</label>
              <input name="t_nationalite" value={t.nationalite} onChange={(e) => update(i, { nationalite: e.target.value })} className={inputCls} dir="ltr" placeholder="Italie" />
            </div>
            <div className="flex items-end pb-1.5">
              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  name="t_visaAnterieur"
                  checked={t.visaAnterieur}
                  onChange={(e) => update(i, { visaAnterieur: e.target.checked })}
                  value="on"
                />
                حصل على فيزا جزائرية سابقاً
              </label>
              {/* قيمة ثابتة حتى تحافظ الحقول المتكررة على ترتيبها عند عدم التحديد */}
              {!t.visaAnterieur && <input type="hidden" name="t_visaAnterieur" value="off" />}
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setRows((prev) => [...prev, { ...empty }])}
        className="text-sm text-sky-600 hover:underline"
      >
        + إضافة مسافر
      </button>
    </div>
  );
}
