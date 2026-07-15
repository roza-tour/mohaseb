"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
  const data = taskOrderSchema.parse({
    tripId: formData.get("tripId"),
    assigneeType: formData.get("assigneeType"),
    guideId: formData.get("guideId") || undefined,
    driverId: formData.get("driverId") || undefined,
    taskDate: formData.get("taskDate"),
    details: formData.get("details") || undefined,
  });

  const created = await prisma.taskOrder.create({ data });
  redirect(`/task-orders/${created.id}/pdf`);
}

export async function deleteTaskOrder(id: string) {
  await prisma.taskOrder.delete({ where: { id } });
  revalidatePath("/task-orders");
}
