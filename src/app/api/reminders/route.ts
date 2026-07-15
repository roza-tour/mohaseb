import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUpcomingTrips } from "@/lib/reminders";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const trips = await getUpcomingTrips();
  return NextResponse.json({ trips });
}
