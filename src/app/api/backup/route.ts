export const runtime = "nodejs";

import { spawn } from "child_process";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// نسخة احتياطية كاملة لقاعدة البيانات بضغطة زر من صفحة الإعدادات.
// يعتمد أولاً على mysqldump (متوفر في استضافات cPanel عادة) لملف SQL
// قابل للاستعادة من phpMyAdmin، وإن لم يتوفر يصدّر البيانات كملف JSON.

function parseDbUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: u.port || "3306",
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ""),
  };
}

function tryMysqldump(): Promise<Buffer | null> {
  return new Promise((resolve) => {
    try {
      const db = parseDbUrl(process.env.DATABASE_URL || "");
      const args = [
        `--host=${db.host}`,
        `--port=${db.port}`,
        `--user=${db.user}`,
        "--single-transaction",
        "--default-character-set=utf8mb4",
        db.database,
      ];
      const child = spawn("mysqldump", args, {
        env: { ...process.env, MYSQL_PWD: db.password },
      });
      const chunks: Buffer[] = [];
      child.stdout.on("data", (c) => chunks.push(c));
      child.on("error", () => resolve(null));
      child.on("close", (code) => {
        if (code === 0 && chunks.length > 0) resolve(Buffer.concat(chunks));
        else resolve(null);
      });
    } catch {
      resolve(null);
    }
  });
}

async function jsonExport(): Promise<Buffer> {
  const [
    users,
    settings,
    customers,
    hotels,
    guides,
    drivers,
    tourPrograms,
    trips,
    hotelBookings,
    flightBookings,
    otherBookings,
    transactions,
    openingBalances,
    taskOrders,
    documentTemplates,
    documents,
    payments,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.settings.findMany(),
    prisma.customer.findMany(),
    prisma.hotel.findMany(),
    prisma.guide.findMany(),
    prisma.driver.findMany(),
    prisma.tourProgram.findMany(),
    prisma.trip.findMany(),
    prisma.hotelBooking.findMany(),
    prisma.flightBooking.findMany(),
    prisma.otherBooking.findMany(),
    prisma.transaction.findMany(),
    prisma.openingBalance.findMany(),
    prisma.taskOrder.findMany(),
    prisma.documentTemplate.findMany(),
    prisma.document.findMany(),
    prisma.payment.findMany(),
  ]);

  return Buffer.from(
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        users,
        settings,
        customers,
        hotels,
        guides,
        drivers,
        tourPrograms,
        trips,
        hotelBookings,
        flightBookings,
        otherBookings,
        transactions,
        openingBalances,
        taskOrders,
        documentTemplates,
        documents,
        payments,
      },
      null,
      2
    ),
    "utf-8"
  );
}

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const sqlDump = await tryMysqldump();

  if (sqlDump) {
    return new NextResponse(new Uint8Array(sqlDump), {
      headers: {
        "Content-Type": "application/sql; charset=utf-8",
        "Content-Disposition": `attachment; filename="mohaseb-backup-${stamp}.sql"`,
      },
    });
  }

  const json = await jsonExport();
  return new NextResponse(new Uint8Array(json), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mohaseb-backup-${stamp}.json"`,
    },
  });
}
