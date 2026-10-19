// خانات أمر التكليف الاختيارية — مصدر واحد للنموذج والحفظ وملف PDF.
//
// كل خانة اختيارية تماماً: الفارغة لا تُحفظ ولا تظهر في الأمر، والمجموعة التي
// لا قيمة فيها يختفي جدولها كله. تُخزَّن في عمود JSON واحد (TaskOrder.fields)
// فإضافة خانة جديدة لاحقاً سطر هنا، بلا هجرة لقاعدة البيانات.
// وما لا تغطيه هذه الخانات يُكتب في «بنود إضافية» (TaskOrder.extraRows).

export type FieldGroup = "trip" | "vehicle" | "guide" | "mission";

export type TaskField = {
  key: string;
  group: FieldGroup;
  type: "text" | "date" | "time";
  ar: string;
  fr: string;
  placeholder?: string;
};

export const TASK_FIELDS: TaskField[] = [
  // بيانات الرحلة اليدوية — تُستعمل فقط إن لم يُربط الأمر برحلة مسجّلة
  { key: "tripProgram", group: "trip", type: "text", ar: "البرنامج / الخدمة", fr: "Programme", placeholder: "مثال: جولة في الصحراء" },
  { key: "tripCustomer", group: "trip", type: "text", ar: "العميل", fr: "Client", placeholder: "اسم العميل أو المجموعة" },
  { key: "tripPax", group: "trip", type: "text", ar: "عدد الأشخاص", fr: "Nombre de personnes" },
  { key: "tripStart", group: "trip", type: "date", ar: "تاريخ بداية الرحلة", fr: "Date de début" },
  { key: "tripEnd", group: "trip", type: "date", ar: "تاريخ نهاية الرحلة", fr: "Date de fin" },

  // المركبة — تظهر في النموذج عند تكليف سائق
  { key: "vehicleType", group: "vehicle", type: "text", ar: "نوع المركبة", fr: "Type de véhicule", placeholder: "مثال: تويوتا لاند كروزر" },
  { key: "vehiclePlate", group: "vehicle", type: "text", ar: "رقم التسجيل (اللوحة)", fr: "Immatriculation", placeholder: "مثال: 12345-120-33" },
  { key: "vehicleSeats", group: "vehicle", type: "text", ar: "عدد المقاعد", fr: "Nombre de places" },
  { key: "licenseCategory", group: "vehicle", type: "text", ar: "صنف رخصة السياقة", fr: "Catégorie du permis", placeholder: "B / C / D" },
  { key: "licenseNumber", group: "vehicle", type: "text", ar: "رقم رخصة السياقة", fr: "N° du permis de conduire" },
  { key: "transportPermit", group: "vehicle", type: "text", ar: "رخصة النقل السياحي", fr: "Agrément de transport touristique" },

  // الاعتماد — تظهر في النموذج عند تكليف مرشد
  { key: "guideCard", group: "guide", type: "text", ar: "رقم بطاقة المرشد / الاعتماد", fr: "N° de carte de guide" },
  { key: "guideLanguages", group: "guide", type: "text", ar: "لغات الإرشاد", fr: "Langues", placeholder: "مثال: العربية، الفرنسية" },

  // التنقّل — للمرشد والسائق معاً
  { key: "endDate", group: "mission", type: "date", ar: "تاريخ نهاية المهمة", fr: "Date de fin de mission" },
  { key: "startTime", group: "mission", type: "time", ar: "ساعة الانطلاق", fr: "Heure de départ" },
  { key: "endTime", group: "mission", type: "time", ar: "ساعة العودة", fr: "Heure de retour" },
  { key: "departurePlace", group: "mission", type: "text", ar: "مكان الانطلاق", fr: "Lieu de départ", placeholder: "مثال: مطار جانت" },
  { key: "destination", group: "mission", type: "text", ar: "الوجهة / خط السير", fr: "Destination / Itinéraire", placeholder: "مثال: جانت ← تقرقارت ← عرق أدمر" },
];

export const GROUP_TITLES: Record<FieldGroup | "extra", { ar: string; fr: string }> = {
  trip: { ar: "بيانات الرحلة", fr: "Informations du voyage" },
  vehicle: { ar: "بيانات المركبة", fr: "Véhicule" },
  guide: { ar: "بيانات الاعتماد", fr: "Accréditation du guide" },
  mission: { ar: "تفاصيل التنقّل", fr: "Déplacement" },
  extra: { ar: "بيانات إضافية", fr: "Informations complémentaires" },
};

export type FieldValues = Record<string, string>;
export type ExtraRow = { label: string; value: string };

const MAX_LEN = 300;
const MAX_EXTRA = 20;

const clean = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, MAX_LEN) : "");

// قراءة الخانات من النموذج: الفارغ لا يُحفظ، وخانات مجموعة لا تخص المكلَّف تُهمل
// وبيانات الرحلة اليدوية تُهمل إن اختير الأمر لرحلة مسجّلة
export function fieldsFromForm(
  formData: FormData,
  assigneeType: "GUIDE" | "DRIVER",
  hasTrip: boolean
): FieldValues | null {
  const out: FieldValues = {};
  for (const f of TASK_FIELDS) {
    if (f.group === "trip" && hasTrip) continue;
    if (f.group === "vehicle" && assigneeType !== "DRIVER") continue;
    if (f.group === "guide" && assigneeType !== "GUIDE") continue;
    const v = clean(formData.get(`f_${f.key}`));
    if (v) out[f.key] = v;
  }
  return Object.keys(out).length ? out : null;
}

// البنود الإضافية: صف بلا اسم وبلا قيمة يُهمل، وصف بقيمة بلا اسم يُحفظ بلا اسم
export function extraRowsFromForm(formData: FormData): ExtraRow[] | null {
  const labels = formData.getAll("extraLabel");
  const values = formData.getAll("extraValue");
  const rows: ExtraRow[] = [];
  for (let i = 0; i < Math.max(labels.length, values.length); i++) {
    const label = clean(labels[i]);
    const value = clean(values[i]);
    if (!value) continue; // الاسم وحده لا معنى له في الأمر
    rows.push({ label, value });
    if (rows.length >= MAX_EXTRA) break;
  }
  return rows.length ? rows : null;
}

// قراءة آمنة لما خُزّن (JSON قد يكون فارغاً أو بشكل غير متوقع)
export function readFields(json: unknown): FieldValues {
  if (!json || typeof json !== "object" || Array.isArray(json)) return {};
  const out: FieldValues = {};
  for (const [k, v] of Object.entries(json as Record<string, unknown>)) {
    if (typeof v === "string" && v.trim()) out[k] = v;
  }
  return out;
}

export function readExtraRows(json: unknown): ExtraRow[] {
  if (!Array.isArray(json)) return [];
  return json
    .filter((r): r is ExtraRow => !!r && typeof r === "object" && typeof (r as ExtraRow).value === "string")
    .map((r) => ({ label: typeof r.label === "string" ? r.label : "", value: r.value }))
    .filter((r) => r.value.trim());
}

// قيمة الخانة كما تُعرض في الأمر (التاريخ بصيغة يوم/شهر/سنة)
export function displayValue(f: TaskField, raw: string): string {
  if (f.type === "date") {
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  }
  return raw;
}

// وصف قصير للرحلة المكتوبة يدوياً (للقوائم): «البرنامج — العميل»، أو null إن لم يُكتب شيء
export function manualTripText(fields: FieldValues): string | null {
  const parts = [fields.tripProgram, fields.tripCustomer].map((v) => v?.trim()).filter(Boolean);
  return parts.length ? parts.join(" — ") : null;
}
