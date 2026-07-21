"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { firstErrorMessage, withError } from "@/lib/formErrors";

function orNull(value: FormDataEntryValue | null) {
  const s = typeof value === "string" ? value.trim() : "";
  return s.length > 0 ? s : null;
}

function orUndefined(value: FormDataEntryValue | null) {
  const s = typeof value === "string" ? value.trim() : "";
  return s.length > 0 ? s : undefined;
}

// ---------- الرحلة ----------

const tripSchema = z.object({
  programId: z.string().min(1, "البرنامج مطلوب"),
  customerId: z.string().min(1, "العميل مطلوب"),
  startDate: z.coerce.date({ message: "تاريخ البداية مطلوب" }),
  endDate: z.coerce.date().optional(),
  numPax: z.coerce.number().int().min(1).default(1),
  agreedPrice: z.coerce.number().min(0).default(0),
  currency: z.string().min(1).default("DZD"),
  status: z.string().default("PLANNED"),
  notes: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v : null)),
});

// يتحقق من البيانات ويعيد إما البيانات الصالحة أو رسالة خطأ عربية
function parseTripForm(
  formData: FormData
): { data: z.infer<typeof tripSchema> & { endDate: Date } } | { error: string } {
  const parsed = tripSchema.safeParse({
    programId: formData.get("programId"),
    customerId: formData.get("customerId"),
    startDate: formData.get("startDate") || undefined,
    endDate: formData.get("endDate") || undefined,
    numPax: formData.get("numPax") || undefined,
    agreedPrice: formData.get("agreedPrice") || undefined,
    currency: formData.get("currency") || undefined,
    status: formData.get("status") || undefined,
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { error: firstErrorMessage(parsed.error) };
  // تاريخ النهاية اختياري — إن تُرك فارغاً نجعله يساوي تاريخ البداية
  const endDate = parsed.data.endDate ?? parsed.data.startDate;
  // فحص ترتيب التاريخين يُجرى فقط عند إدخال تاريخ نهاية
  if (parsed.data.endDate && parsed.data.endDate < parsed.data.startDate) {
    return { error: "تاريخ نهاية الرحلة لا يمكن أن يسبق تاريخ بدايتها" };
  }
  return { data: { ...parsed.data, endDate } };
}

export async function createTrip(formData: FormData) {
  const result = parseTripForm(formData);
  if ("error" in result) redirect(withError("/trips/new", result.error));
  const trip = await prisma.trip.create({ data: result.data });
  revalidatePath("/trips");
  redirect(`/trips/${trip.id}`);
}

export async function updateTrip(id: string, formData: FormData) {
  const result = parseTripForm(formData);
  if ("error" in result) redirect(withError(`/trips/${id}/edit`, result.error));
  await prisma.trip.update({ where: { id }, data: result.data });
  revalidatePath("/trips");
  revalidatePath(`/trips/${id}`);
  redirect(`/trips/${id}`);
}

export async function deleteTrip(id: string) {
  await prisma.trip.delete({ where: { id } });
  revalidatePath("/trips");
  redirect("/trips");
}

const statusSchema = z.object({
  status: z.enum(["PLANNED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
});

export async function updateTripStatus(id: string, formData: FormData) {
  const { status } = statusSchema.parse({ status: formData.get("status") });
  await prisma.trip.update({ where: { id }, data: { status } });
  revalidatePath(`/trips/${id}`);
}

// ---------- حجوزات الفنادق ----------

const hotelBookingSchema = z.object({
  hotelId: z.string().min(1, "الفندق مطلوب"),
  checkIn: z.coerce.date().optional(),
  checkOut: z.coerce.date().optional(),
  roomType: z.string().optional().nullable(),
  numRooms: z.coerce.number().int().min(1).default(1),
  cost: z.coerce.number().min(0).default(0),
  confirmationNumber: z.string().optional().nullable(),
});

export async function createHotelBooking(tripId: string, formData: FormData) {
  const parsed = hotelBookingSchema.safeParse({
    hotelId: formData.get("hotelId"),
    checkIn: formData.get("checkIn") || undefined,
    checkOut: formData.get("checkOut") || undefined,
    roomType: orNull(formData.get("roomType")),
    numRooms: formData.get("numRooms") || undefined,
    cost: formData.get("cost") || undefined,
    confirmationNumber: orNull(formData.get("confirmationNumber")),
  });
  if (!parsed.success) redirect(withError(`/trips/${tripId}`, firstErrorMessage(parsed.error)));
  // فحص ترتيب التاريخين يُجرى فقط عند إدخال التاريخين معاً
  if (parsed.data.checkIn && parsed.data.checkOut && parsed.data.checkOut < parsed.data.checkIn) {
    redirect(withError(`/trips/${tripId}`, "تاريخ مغادرة الفندق لا يمكن أن يسبق تاريخ الوصول"));
  }
  // التاريخان اختياريان — يبقيان فارغين (null) إن لم يُدخلا، بدل افتراض تاريخ اليوم
  await prisma.hotelBooking.create({
    data: { ...parsed.data, checkIn: parsed.data.checkIn ?? null, checkOut: parsed.data.checkOut ?? null, tripId },
  });
  revalidatePath(`/trips/${tripId}`);
}

export async function deleteHotelBooking(tripId: string, id: string) {
  await prisma.hotelBooking.delete({ where: { id } });
  revalidatePath(`/trips/${tripId}`);
}

// ---------- حجوزات الطيران ----------

const flightBookingSchema = z.object({
  airline: z.string().min(1, "شركة الطيران مطلوبة"),
  flightNumber: z.string().optional().nullable(),
  departureAirport: z.string().optional().nullable(),
  arrivalAirport: z.string().optional().nullable(),
  departureDate: z.coerce.date().optional(),
  arrivalDate: z.coerce.date().optional().nullable(),
  cost: z.coerce.number().min(0).default(0),
  pnr: z.string().optional().nullable(),
});

export async function createFlightBooking(tripId: string, formData: FormData) {
  const parsed = flightBookingSchema.safeParse({
    airline: formData.get("airline"),
    flightNumber: orNull(formData.get("flightNumber")),
    departureAirport: orNull(formData.get("departureAirport")),
    arrivalAirport: orNull(formData.get("arrivalAirport")),
    departureDate: formData.get("departureDate") || undefined,
    arrivalDate: orUndefined(formData.get("arrivalDate")),
    cost: formData.get("cost") || undefined,
    pnr: orNull(formData.get("pnr")),
  });
  if (!parsed.success) redirect(withError(`/trips/${tripId}`, firstErrorMessage(parsed.error)));
  // تاريخ المغادرة اختياري — يبقى فارغاً (null) إن لم يُدخل
  await prisma.flightBooking.create({
    data: { ...parsed.data, departureDate: parsed.data.departureDate ?? null, tripId },
  });
  revalidatePath(`/trips/${tripId}`);
}

export async function deleteFlightBooking(tripId: string, id: string) {
  await prisma.flightBooking.delete({ where: { id } });
  revalidatePath(`/trips/${tripId}`);
}

// ---------- حجوزات أخرى ----------

const otherBookingSchema = z.object({
  type: z.string().min(1, "النوع مطلوب"),
  description: z.string().optional().nullable(),
  provider: z.string().optional().nullable(),
  cost: z.coerce.number().min(0).default(0),
  date: z.coerce.date().optional().nullable(),
});

export async function createOtherBooking(tripId: string, formData: FormData) {
  const parsed = otherBookingSchema.safeParse({
    type: formData.get("type"),
    description: orNull(formData.get("description")),
    provider: orNull(formData.get("provider")),
    cost: formData.get("cost") || undefined,
    date: orUndefined(formData.get("date")),
  });
  if (!parsed.success) redirect(withError(`/trips/${tripId}`, firstErrorMessage(parsed.error)));
  await prisma.otherBooking.create({ data: { ...parsed.data, tripId } });
  revalidatePath(`/trips/${tripId}`);
}

export async function deleteOtherBooking(tripId: string, id: string) {
  await prisma.otherBooking.delete({ where: { id } });
  revalidatePath(`/trips/${tripId}`);
}
