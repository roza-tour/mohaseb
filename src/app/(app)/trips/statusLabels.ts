export const TRIP_STATUSES = ["PLANNED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

export type TripStatus = (typeof TRIP_STATUSES)[number];

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  PLANNED: "مخطط لها",
  CONFIRMED: "مؤكدة",
  IN_PROGRESS: "قيد التنفيذ",
  COMPLETED: "منتهية",
  CANCELLED: "ملغاة",
};

export const TRIP_STATUS_COLORS: Record<TripStatus, "slate" | "green" | "red" | "amber" | "sky"> = {
  PLANNED: "slate",
  CONFIRMED: "sky",
  IN_PROGRESS: "amber",
  COMPLETED: "green",
  CANCELLED: "red",
};

export const CURRENCIES = ["JOD", "USD", "EUR", "SAR", "EGP"];
