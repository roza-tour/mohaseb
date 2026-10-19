"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { firstErrorMessage, withError } from "@/lib/formErrors";
import { logActivity } from "@/lib/activity";
import { fieldsFromForm, extraRowsFromForm, manualTripText, readFields } from "@/lib/taskOrderFields";
import { Prisma } from "@prisma/client";

const taskOrderSchema = z
  .object({
    // الرحلة اختيارية: بدونها يُكتب البرنامج والعميل يدوياً
    tripId: z.string().optional(),
    assigneeType: z.enum(["GUIDE", "DRIVER"]),
    guideId: z.string().optional(),
    driverId: z.string().optional(),
    taskDate: z.coerce.date(),
    details: z.string().optional(),
  })
  .transform((data) => ({
    ...data,
    tripId: data.tripId || null,
    guideId: data.assigneeType === "GUIDE" ? data.guideId || null : null,
    driverId: data.assigneeType === "DRIVER" ? data.driverId || null : null,
    details: data.details && data.details.trim() !== "" ? data.details : null,
  }));

type TaskOrderData = z.infer<typeof taskOrderSchema>;

function readForm(formData: FormData) {
  return taskOrderSchema.safeParse({
    tripId: formData.get("tripId") || undefined,
    assigneeType: formData.get("assigneeType"),
    guideId: formData.get("guideId") || undefined,
    driverId: formData.get("driverId") || undefined,
    taskDate: formData.get("taskDate"),
    details: formData.get("details") || undefined,
  });
}

// الخانات الاختيارية والبنود الإضافية — تُحفظ JSON، والفارغ منها لا يُحفظ أصلاً
function readExtras(formData: FormData, data: TaskOrderData) {
  const fields = fieldsFromForm(formData, data.assigneeType, !!data.tripId);
  const extraRows = extraRowsFromForm(formData);
  let error: string | null = null;
  if (fields?.tripStart && fields?.tripEnd && fields.tripEnd < fields.tripStart) {
    error = "تاريخ نهاية الرحلة لا يمكن أن يسبق تاريخ بدايتها";
  }
  if (fields?.endDate) {
    const end = new Date(`${fields.endDate}T00:00:00Z`);
    const start = new Date(data.taskDate);
    start.setUTCHours(0, 0, 0, 0);
    if (!isNaN(end.getTime()) && end < start) error = "تاريخ نهاية المهمة لا يمكن أن يسبق تاريخ المهمة";
  }
  return {
    error,
    values: {
      fields: fields ?? Prisma.DbNull,
      extraRows: extraRows ?? Prisma.DbNull,
    },
  };
}

// كشف تعارض المواعيد: نفس المكلَّف لا يُكلَّف بمهمتين في نفس اليوم.
// تُعاد رسالة الخطأ جاهزة للعرض، أو null إن لم يوجد تعارض.
async function conflictMessage(data: TaskOrderData, exceptId?: string): Promise<string | null> {
  const dayStart = new Date(data.taskDate);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
  const conflict = await prisma.taskOrder.findFirst({
    where: {
      ...(exceptId ? { id: { not: exceptId } } : {}),
      taskDate: { gte: dayStart, lt: dayEnd },
      ...(data.assigneeType === "GUIDE" ? { guideId: data.guideId } : { driverId: data.driverId }),
    },
    include: { trip: { include: { program: true } }, guide: true, driver: true },
  });
  if (!conflict) return null;
  const who = conflict.guide?.name ?? conflict.driver?.name ?? "المكلَّف";
  const what = conflict.trip?.program.name ?? manualTripText(readFields(conflict.fields));
  return `تعارض في المواعيد: ${who} مكلَّف بمهمة أخرى في نفس اليوم${what ? ` (${what})` : ""} — غيّر التاريخ أو اختر مكلَّفاً آخر`;
}

// التحقق من اختيار المكلَّف فعلياً (القائمة قد تكون فارغة إن لم يُسجَّل أي مرشد/سائق)
function missingAssigneeMessage(data: TaskOrderData): string | null {
  if (data.assigneeType === "GUIDE" && !data.guideId) {
    return "اختر المرشد السياحي المكلَّف بالمهمة — إن لم تكن القائمة تعرض أحداً فأضف مرشداً أولاً من صفحة المرشدين";
  }
  if (data.assigneeType === "DRIVER" && !data.driverId) {
    return "اختر السائق المكلَّف بالمهمة — إن لم تكن القائمة تعرض أحداً فأضف سائقاً أولاً من صفحة السائقين";
  }
  return null;
}

function newOrderPath(formData: FormData): string {
  const type = formData.get("assigneeType") === "DRIVER" ? "DRIVER" : "GUIDE";
  const tripId = formData.get("tripId");
  return `/task-orders/new?type=${type}${typeof tripId === "string" && tripId ? `&tripId=${encodeURIComponent(tripId)}` : ""}`;
}

export async function createTaskOrder(formData: FormData) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect("/login");

  // عند الخطأ نعود لنفس النموذج (أمر مرشد أو أمر سائق) ونفس الرحلة
  const back = newOrderPath(formData);
  const parsed = readForm(formData);
  if (!parsed.success) redirect(withError(back, firstErrorMessage(parsed.error)));
  const data = parsed.data;

  const missing = missingAssigneeMessage(data);
  if (missing) redirect(withError(back, missing));

  const extras = readExtras(formData, data);
  if (extras.error) redirect(withError(back, extras.error));

  const conflict = await conflictMessage(data);
  if (conflict) redirect(withError(back, conflict));

  // نسجّل مُصدِر الأمر (حقل createdById في الجدول كان يبقى فارغاً دائماً)
  const creator = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  const created = await prisma.taskOrder.create({
    data: { ...data, ...extras.values, createdById: creator?.id ?? null },
    include: { guide: true, driver: true, trip: { include: { program: true } } },
  });

  await logActivity(
    "create",
    "TaskOrder",
    `أمر تكليف لـ ${created.guide?.name ?? created.driver?.name ?? "—"} — ${
      created.trip?.program.name ?? manualTripText(readFields(created.fields)) ?? "بلا رحلة"
    }`
  );
  revalidatePath("/task-orders");
  revalidatePath("/schedule");
  redirect(`/task-orders/${created.id}/pdf`);
}

// تعديل أمر تكليف صادر
export async function updateTaskOrder(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const existing = await prisma.taskOrder.findUnique({ where: { id } });
  if (!existing) redirect("/task-orders");
  const back = `/task-orders/${id}`;

  const parsed = readForm(formData);
  if (!parsed.success) redirect(withError(back, firstErrorMessage(parsed.error)));
  const data = parsed.data;

  const missing = missingAssigneeMessage(data);
  if (missing) redirect(withError(back, missing));

  const extras = readExtras(formData, data);
  if (extras.error) redirect(withError(back, extras.error));

  // كشف التعارض مع استثناء الأمر الجاري تعديله نفسه
  const conflict = await conflictMessage(data, id);
  if (conflict) redirect(withError(back, conflict));

  await prisma.taskOrder.update({ where: { id }, data: { ...data, ...extras.values } });
  await logActivity("update", "TaskOrder", "تعديل أمر تكليف");
  revalidatePath("/task-orders");
  revalidatePath("/schedule");
  redirect("/task-orders?updated=1");
}

export async function deleteTaskOrder(id: string) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const removed = await prisma.taskOrder.delete({
    where: { id },
    include: { guide: true, driver: true },
  });
  await logActivity("delete", "TaskOrder", `حذف أمر تكليف لـ ${removed.guide?.name ?? removed.driver?.name ?? "—"}`);
  revalidatePath("/task-orders");
  revalidatePath("/schedule");
}
