export const PAYMENT_METHODS = ["CASH", "BANK", "CHEQUE", "OTHER"] as const;

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "نقداً",
  BANK: "تحويل بنكي",
  CHEQUE: "شيك",
  OTHER: "أخرى",
};
