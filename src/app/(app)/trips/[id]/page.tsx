import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  PageHeader,
  Card,
  LinkButton,
  Button,
  Table,
  Th,
  Td,
  EmptyState,
  Badge,
  Field,
  Input,
  Select,
  ErrorBanner,
} from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { formatDate, formatCurrency } from "@/lib/format";
import { TRIP_STATUSES, TRIP_STATUS_LABELS, TRIP_STATUS_COLORS, TripStatus } from "../statusLabels";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/lib/payments";
import { createPayment, deletePayment } from "../paymentActions";
import { createAttachment, deleteAttachment } from "../attachmentActions";
import { waLink } from "@/lib/whatsapp";
import { formatDateForInput } from "@/lib/format";
import {
  deleteTrip,
  updateTripStatus,
  createHotelBooking,
  deleteHotelBooking,
  createFlightBooking,
  deleteFlightBooking,
  createOtherBooking,
  deleteOtherBooking,
} from "../actions";

const ASSIGNEE_TYPE_LABELS: Record<string, string> = {
  GUIDE: "مرشد سياحي",
  DRIVER: "سائق",
};

export default async function TripDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const [trip, hotels] = await Promise.all([
    prisma.trip.findUnique({
      where: { id },
      include: {
        program: true,
        customer: true,
        hotelBookings: { include: { hotel: true }, orderBy: { checkIn: "asc" } },
        flightBookings: { orderBy: { departureDate: "asc" } },
        otherBookings: { orderBy: { date: "asc" } },
        taskOrders: { include: { guide: true, driver: true }, orderBy: { taskDate: "desc" } },
        payments: { orderBy: { paidAt: "asc" } },
        attachments: { orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.hotel.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!trip) notFound();

  const totalBookingCost =
    trip.hotelBookings.reduce((s, b) => s + b.cost, 0) +
    trip.flightBookings.reduce((s, b) => s + b.cost, 0) +
    trip.otherBookings.reduce((s, b) => s + b.cost, 0);
  const estimatedProfit = trip.agreedPrice - totalBookingCost;
  const profitColor = estimatedProfit > 0 ? "green" : estimatedProfit < 0 ? "red" : "slate";
  const waMessage = `مرحباً ${trip.customer.name}، تذكير بموعد رحلتكم "${trip.program.name}" من ${formatDate(trip.startDate)} إلى ${formatDate(trip.endDate)}. نتمنى لكم رحلة سعيدة!`;
  const customerWa = waLink(trip.customer.phone, waMessage);
  const totalPaid = trip.payments.reduce((s, p) => s + p.amount, 0);
  const remaining = trip.agreedPrice - totalPaid;
  const remainingColor = remaining <= 0 ? "green" : "amber";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`رحلة: ${trip.program.name}`}
        description={`${trip.customer.name} — ${formatDate(trip.startDate)} إلى ${formatDate(trip.endDate)}`}
        action={
          <div className="flex items-center gap-3">
            <LinkButton href={`/trips/${id}/edit`} variant="secondary">
              تعديل
            </LinkButton>
            <DeleteButton
              action={deleteTrip.bind(null, id)}
              confirmMessage="هل أنت متأكد من حذف هذه الرحلة؟ سيتم حذف جميع الحجوزات وأوامر التكليف المرتبطة بها."
            />
          </div>
        }
      />

      <ErrorBanner message={sp.error} />

      {/* بطاقة معلومات الرحلة */}
      <Card className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-500 mb-1">البرنامج السياحي</p>
            <p className="text-slate-800 font-medium">{trip.program.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{trip.program.durationDays} يوماً</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">العميل</p>
            <p className="text-slate-800 font-medium">{trip.customer.name}</p>
            {trip.customer.phone && (
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                {trip.customer.phone}
                {customerWa && (
                  <a
                    href={customerWa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:underline font-medium"
                  >
                    💬 واتساب
                  </a>
                )}
              </p>
            )}
            {trip.customer.email && <p className="text-xs text-slate-500 mt-0.5">{trip.customer.email}</p>}
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">التاريخ</p>
            <p className="text-slate-800 font-medium">
              {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">عدد الأشخاص</p>
            <p className="text-slate-800 font-medium">{trip.numPax}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">السعر الإجمالي المتفق عليه</p>
            <p className="text-slate-800 font-medium">{formatCurrency(trip.agreedPrice, trip.currency)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">الحالة الحالية</p>
            <Badge color={TRIP_STATUS_COLORS[trip.status as TripStatus]}>
              {TRIP_STATUS_LABELS[trip.status as TripStatus] ?? trip.status}
            </Badge>
          </div>
          {trip.notes && (
            <div className="sm:col-span-2 lg:col-span-3">
              <p className="text-xs text-slate-500 mb-1">ملاحظات</p>
              <p className="text-slate-700 whitespace-pre-line">{trip.notes}</p>
            </div>
          )}
        </div>

        <form action={updateTripStatus.bind(null, id)} className="flex items-end gap-3 mt-5 pt-5 border-t border-slate-100">
          <div className="w-56">
            <Field label="تحديث حالة الرحلة">
              <Select name="status" defaultValue={trip.status}>
                {TRIP_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {TRIP_STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Button type="submit" variant="secondary">
            تحديث الحالة
          </Button>
        </form>
      </Card>

      {/* بطاقة الملخص المالي */}
      <Card className="p-5">
        <h2 className="font-bold text-slate-800 mb-4">الملخص المالي</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-500 mb-1">السعر الإجمالي المتفق عليه</p>
            <p className="text-slate-800 font-medium">{formatCurrency(trip.agreedPrice, trip.currency)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">إجمالي تكلفة الحجوزات</p>
            <p className="text-slate-800 font-medium">{formatCurrency(totalBookingCost, trip.currency)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">الربح التقديري</p>
            <Badge color={profitColor}>{formatCurrency(estimatedProfit, trip.currency)}</Badge>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">المدفوع من العميل</p>
            <p className="text-emerald-700 font-medium">{formatCurrency(totalPaid, trip.currency)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">المتبقي على العميل</p>
            <Badge color={remainingColor}>{formatCurrency(remaining, trip.currency)}</Badge>
          </div>
        </div>
      </Card>

      {/* دفعات العميل وسندات القبض */}
      <Card className="p-5">
        <h2 className="font-bold text-slate-800 mb-4">دفعات العميل (سندات القبض)</h2>
        {trip.payments.length === 0 ? (
          <EmptyState message="لا توجد دفعات مسجلة بعد" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>رقم السند</Th>
                <Th>التاريخ</Th>
                <Th>المبلغ</Th>
                <Th>طريقة الدفع</Th>
                <Th>المرجع</Th>
                <Th></Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {trip.payments.map((p) => (
                <tr key={p.id}>
                  <Td className="font-mono text-xs">{p.receiptNumber}</Td>
                  <Td>{formatDate(p.paidAt)}</Td>
                  <Td className="font-medium text-emerald-700">{formatCurrency(p.amount, trip.currency)}</Td>
                  <Td>{PAYMENT_METHOD_LABELS[p.method] ?? p.method}</Td>
                  <Td>{p.reference ?? "-"}</Td>
                  <Td>
                    <Link
                      href={`/payments/${p.id}/pdf`}
                      target="_blank"
                      className="text-sky-600 text-sm hover:underline"
                    >
                      سند القبض PDF
                    </Link>
                  </Td>
                  <Td>
                    <DeleteButton action={deletePayment.bind(null, id, p.id)} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        <form
          action={createPayment.bind(null, id)}
          className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end"
        >
          <Field label="المبلغ" required>
            <Input type="number" name="amount" step="0.01" min={0.01} required />
          </Field>
          <Field label="تاريخ الدفعة">
            <Input type="date" name="paidAt" defaultValue={formatDateForInput(new Date())} />
          </Field>
          <Field label="طريقة الدفع">
            <Select name="method" defaultValue="CASH">
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_METHOD_LABELS[m]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="المرجع (شيك/تحويل)">
            <Input name="reference" />
          </Field>
          <Field label="ملاحظات">
            <Input name="notes" />
          </Field>
          <div>
            <Button type="submit">تسجيل دفعة</Button>
          </div>
        </form>
      </Card>

      {/* حجوزات الفنادق */}
      <Card className="p-5">
        <h2 className="font-bold text-slate-800 mb-4">حجوزات الفنادق</h2>
        {trip.hotelBookings.length === 0 ? (
          <EmptyState message="لا توجد حجوزات فنادق بعد" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>الفندق</Th>
                <Th>المدينة</Th>
                <Th>تسجيل الوصول</Th>
                <Th>تسجيل المغادرة</Th>
                <Th>نوع الغرفة</Th>
                <Th>عدد الغرف</Th>
                <Th>التكلفة</Th>
                <Th>رقم التأكيد</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {trip.hotelBookings.map((hb) => (
                <tr key={hb.id}>
                  <Td>{hb.hotel.name}</Td>
                  <Td>{hb.hotel.city ?? "-"}</Td>
                  <Td>{formatDate(hb.checkIn)}</Td>
                  <Td>{formatDate(hb.checkOut)}</Td>
                  <Td>{hb.roomType ?? "-"}</Td>
                  <Td>{hb.numRooms}</Td>
                  <Td>{formatCurrency(hb.cost, trip.currency)}</Td>
                  <Td>{hb.confirmationNumber ?? "-"}</Td>
                  <Td>
                    <DeleteButton action={deleteHotelBooking.bind(null, id, hb.id)} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        {hotels.length === 0 ? (
          <p className="text-xs text-slate-500 mt-4">
            لا يوجد فنادق بعد.{" "}
            <Link href="/hotels/new" className="text-sky-600 hover:underline">
              إضافة فندق جديد
            </Link>
          </p>
        ) : (
          <form
            action={createHotelBooking.bind(null, id)}
            className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 items-end"
          >
            <Field label="الفندق" required>
              <Select name="hotelId" required defaultValue="">
                <option value="" disabled>
                  اختر
                </option>
                {hotels.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="تسجيل الوصول">
              <Input type="date" name="checkIn" />
            </Field>
            <Field label="تسجيل المغادرة">
              <Input type="date" name="checkOut" />
            </Field>
            <Field label="نوع الغرفة">
              <Input type="text" name="roomType" />
            </Field>
            <Field label="عدد الغرف">
              <Input type="number" name="numRooms" min={1} defaultValue={1} />
            </Field>
            <Field label="التكلفة">
              <Input type="number" name="cost" min={0} step="0.01" defaultValue={0} />
            </Field>
            <Field label="رقم التأكيد">
              <Input type="text" name="confirmationNumber" />
            </Field>
            <div className="col-span-2 sm:col-span-4 lg:col-span-7">
              <Button type="submit">إضافة حجز فندق</Button>
            </div>
          </form>
        )}
      </Card>

      {/* حجوزات الطيران */}
      <Card className="p-5">
        <h2 className="font-bold text-slate-800 mb-4">حجوزات الطيران</h2>
        {trip.flightBookings.length === 0 ? (
          <EmptyState message="لا توجد حجوزات طيران بعد" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>شركة الطيران</Th>
                <Th>رقم الرحلة</Th>
                <Th>مطار المغادرة</Th>
                <Th>مطار الوصول</Th>
                <Th>تاريخ المغادرة</Th>
                <Th>تاريخ الوصول</Th>
                <Th>التكلفة</Th>
                <Th>PNR</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {trip.flightBookings.map((fb) => (
                <tr key={fb.id}>
                  <Td>{fb.airline}</Td>
                  <Td>{fb.flightNumber ?? "-"}</Td>
                  <Td>{fb.departureAirport ?? "-"}</Td>
                  <Td>{fb.arrivalAirport ?? "-"}</Td>
                  <Td>{formatDate(fb.departureDate)}</Td>
                  <Td>{fb.arrivalDate ? formatDate(fb.arrivalDate) : "-"}</Td>
                  <Td>{formatCurrency(fb.cost, trip.currency)}</Td>
                  <Td>{fb.pnr ?? "-"}</Td>
                  <Td>
                    <DeleteButton action={deleteFlightBooking.bind(null, id, fb.id)} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        <form
          action={createFlightBooking.bind(null, id)}
          className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 items-end"
        >
          <Field label="شركة الطيران" required>
            <Input type="text" name="airline" required />
          </Field>
          <Field label="رقم الرحلة">
            <Input type="text" name="flightNumber" />
          </Field>
          <Field label="مطار المغادرة">
            <Input type="text" name="departureAirport" />
          </Field>
          <Field label="مطار الوصول">
            <Input type="text" name="arrivalAirport" />
          </Field>
          <Field label="تاريخ المغادرة">
            <Input type="date" name="departureDate" />
          </Field>
          <Field label="تاريخ الوصول">
            <Input type="date" name="arrivalDate" />
          </Field>
          <Field label="التكلفة">
            <Input type="number" name="cost" min={0} step="0.01" defaultValue={0} />
          </Field>
          <Field label="PNR">
            <Input type="text" name="pnr" />
          </Field>
          <div className="col-span-2 sm:col-span-4 lg:col-span-8">
            <Button type="submit">إضافة حجز طيران</Button>
          </div>
        </form>
      </Card>

      {/* حجوزات أخرى */}
      <Card className="p-5">
        <h2 className="font-bold text-slate-800 mb-4">حجوزات أخرى (تأمين، نشاطات، مطاعم...)</h2>
        {trip.otherBookings.length === 0 ? (
          <EmptyState message="لا توجد حجوزات أخرى بعد" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>النوع</Th>
                <Th>الوصف</Th>
                <Th>المزوّد</Th>
                <Th>التكلفة</Th>
                <Th>التاريخ</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {trip.otherBookings.map((ob) => (
                <tr key={ob.id}>
                  <Td>{ob.type}</Td>
                  <Td>{ob.description ?? "-"}</Td>
                  <Td>{ob.provider ?? "-"}</Td>
                  <Td>{formatCurrency(ob.cost, trip.currency)}</Td>
                  <Td>{ob.date ? formatDate(ob.date) : "-"}</Td>
                  <Td>
                    <DeleteButton action={deleteOtherBooking.bind(null, id, ob.id)} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        <form
          action={createOtherBooking.bind(null, id)}
          className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 items-end"
        >
          <Field label="النوع" required>
            <Input type="text" name="type" required placeholder="مثال: تأمين سفر" />
          </Field>
          <Field label="الوصف">
            <Input type="text" name="description" />
          </Field>
          <Field label="المزوّد">
            <Input type="text" name="provider" />
          </Field>
          <Field label="التكلفة">
            <Input type="number" name="cost" min={0} step="0.01" defaultValue={0} />
          </Field>
          <Field label="التاريخ">
            <Input type="date" name="date" />
          </Field>
          <div className="col-span-2 sm:col-span-3 lg:col-span-5">
            <Button type="submit">إضافة حجز آخر</Button>
          </div>
        </form>
      </Card>

      {/* مرفقات الرحلة */}
      <Card className="p-5">
        <h2 className="font-bold text-slate-800 mb-4">مرفقات الرحلة (جوازات، تذاكر، تأكيدات...)</h2>
        {trip.attachments.length === 0 ? (
          <EmptyState message="لا توجد مرفقات بعد" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>الوصف</Th>
                <Th>الحجم</Th>
                <Th>أضيف بتاريخ</Th>
                <Th></Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {trip.attachments.map((a) => (
                <tr key={a.id}>
                  <Td className="font-medium text-slate-800">{a.label}</Td>
                  <Td>{(a.size / 1024).toFixed(0)} KB</Td>
                  <Td>{formatDate(a.createdAt)}</Td>
                  <Td>
                    <a
                      href={a.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-600 text-sm hover:underline"
                    >
                      فتح / تحميل
                    </a>
                  </Td>
                  <Td>
                    <DeleteButton action={deleteAttachment.bind(null, id, a.id)} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        <form
          action={createAttachment.bind(null, id)}
          className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-end gap-3"
        >
          <div className="w-full sm:w-auto sm:min-w-64">
            <Field label="الملف (صورة أو PDF، حتى 8MB)">
              <Input type="file" name="file" accept="image/*,application/pdf" required />
            </Field>
          </div>
          <div className="w-full sm:w-auto sm:min-w-52">
            <Field label="وصف الملف (اختياري)">
              <Input name="label" placeholder="مثال: جواز سفر العميل" />
            </Field>
          </div>
          <Button type="submit" variant="secondary">
            رفع المرفق
          </Button>
        </form>
      </Card>

      {/* أوامر التكليف */}
      <Card className="p-5">
        <h2 className="font-bold text-slate-800 mb-4">أوامر التكليف الصادرة</h2>
        {trip.taskOrders.length === 0 ? (
          <EmptyState message="لا توجد أوامر تكليف صادرة بعد" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>المكلَّف</Th>
                <Th>النوع</Th>
                <Th>تاريخ المهمة</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {trip.taskOrders.map((to) => (
                <tr key={to.id}>
                  <Td>{to.guide?.name ?? to.driver?.name ?? "-"}</Td>
                  <Td>{ASSIGNEE_TYPE_LABELS[to.assigneeType] ?? to.assigneeType}</Td>
                  <Td>{formatDate(to.taskDate)}</Td>
                  <Td>
                    <Link href={`/task-orders/${to.id}/pdf`} target="_blank" className="text-xs text-sky-600 hover:underline">
                      عرض PDF
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
          <LinkButton href={`/task-orders/new?tripId=${id}`}>+ إصدار أمر تكليف جديد</LinkButton>
          <LinkButton href={`/documents/new?tripId=${id}`} variant="secondary">
            + إصدار مستند (دعوة، تصريح...)
          </LinkButton>
          <LinkButton href={`/invoices/new?tripId=${id}`} variant="secondary">
            + إصدار فاتورة
          </LinkButton>
          <LinkButton href={`/visa/new?tripId=${id}`} variant="secondary">
            + إنشاء فيزا صحراوية
          </LinkButton>
        </div>
      </Card>
    </div>
  );
}
