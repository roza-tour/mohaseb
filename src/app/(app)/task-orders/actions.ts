"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { firstErrorMessage, withError } from "@/lib/formErrors";
import { logActivity } from "@/lib/activity";

const taskOrderSchema = z
  .object({
    tripId: z.string().min(1),
    assigneeType: z.enum(["GUIDE", "DRIVER"]),
    guideId: z.string().optional(),
    driverId: z.string().optional(),
    taskDate: z.coerce.date(),
    details: z.string().optional(),
  })
  .transform((data) => ({
    ...data,
    guideId: data.assigneeType === "GUIDE" ? data.guideId || null : null,
    driverId: data.assigneeType === "DRIVER" ? data.driverId || null : null,
    details: data.details && data.details.trim() !== "" ? data.details : null,
  }));

export async function createTaskOrder(formData: FormData) {
  const parsed = taskOrderSchema.safeParse({
    tripId: formData.get("tripId"),
    assigneeType: formData.get("assigneeType"),
    guideId: formData.get("guideId") || undefined,
    driverId: formData.get("driverId") || undefined,
    taskDate: formData.get("taskDate"),
    details: formData.get("details") || undefined,
  });
  if (!parsed.success) redirect(withError("/task-orders/new", firstErrorMessage(parsed.error)));
  const data = parsed.data;
  if (data.assigneeType === "GUIDE" && !data.guideId) {
    redirect(withError("/task-orders/new", "اختر المرشد السياحي المكلَّف بالمهمة"));
  }
  if (data.assigneeType === "DRIVER" && !data.driverId) {
    redirect(withError("/task-orders/new", "اختر السائق المكلَّف بالمهمة"));
  }

  // كشف تعارض المواعيد: نفس المكلَّف لا يُكلَّف بمهمتين في نفس اليوم
  const dayStart = new Date(data.taskDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const conflict = await prisma.taskOrder.findFirst({
    where: {
      taskDate: { gte: dayStart, lt: dayEnd },
      ...(data.assigneeType === "GUIDE" ? { guideId: data.guideId } : { driverId: data.driverId }),
    },
    include: { trip: { include: { program: true } }, guide: true, driver: true },
  });
  if (conflict) {
    const who = conflict.guide?.name ?? conflict.driver?.name ?? "المكلَّف";
    redirect(
      withError(
        "/task-orders/new",
        `تعارض في المواعيد: ${who} مكلَّف بمهمة أخرى في نفس اليوم (رحلة ${conflict.trip.program.name}) — غيّر التاريخ أو اختر مكلَّفاً آخر`
      )
    );
  }

  const created = await prisma.taskOrder.create({ data });
  redirect(`/task-orders/${created.id}/pdf`);
}

// تعديل أمر تكليف صادر
export async function updateTaskOrder(id: string, formData: FormData) {
  const existing = await prisma.taskOrder.findUnique({ where: { id } });
  if (!existing) redirect("/task-orders");
  const back = `/task-orders/${id}`;

  const parsed = taskOrderSchema.safeParse({
    tripId: formData.get("tripId"),
    assigneeType: formData.get("assigneeType"),
    guideId: formData.get("guideId") || undefined,
    driverId: formData.get("driverId") || undefined,
    taskDate: formData.get("taskDate"),
    details: formData.get("details") || undefined,
  });
  if (!parsed.success) redirect(withError(back, firstErrorMessage(parsed.error)));
  const data = parsed.data;
  if (data.assigneeType === "GUIDE" && !data.guideId) {
    redirect(withError(back, "اختر المرشد السياحي المكلَّف بالمهمة"));
  }
  if (data.assigneeType === "DRIVER" && !data.driverId) {
    redirect(withError(back, "اختر السائق المكلَّف بالمهمة"));
  }

  // كشف التعارض مع استثناء الأمر الجاري تعديله نفسه
  const dayStart = new Date(data.taskDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const conflict = await prisma.taskOrder.findFirst({
    where: {
      id: { not: id },
      taskDate: { gte: dayStart, lt: dayEnd },
      ...(data.assigneeType === "GUIDE" ? { guideId: data.guideId } : { driverId: data.driverId }),
    },
    include: { trip: { include: { program: true } }, guide: true, driver: true },
  });
  if (conflict) {
    const who = conflict.guide?.name ?? conflict.driver?.name ?? "المكلَّف";
    redirect(
      withError(
        back,
        `تعارض في المواعيد: ${who} مكلَّف بمهمة أخرى في نفس اليوم (رحلة ${conflict.trip.program.name}) — غيّر التاريخ أو اختر مكلَّفاً آخر`
      )
    );
  }

  await prisma.taskOrder.update({ where: { id }, data });
  await logActivity("update", "TaskOrder", "تعديل أمر تكليف");
  revalidatePath("/task-orders");
  redirect("/task-orders?updated=1");
}

export async function deleteTaskOrder(id: string) {
  await prisma.taskOrder.delete({ where: { id } });
  revalidatePath("/task-orders");
}
