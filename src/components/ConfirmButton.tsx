"use client";

// زر يشغّل server action بعد تأكيد المستخدم (للإجراءات المؤثّرة مثل إرسال العروض)
export function ConfirmButton({
  action,
  label,
  confirmMessage,
  className = "rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-1.5 text-sm font-medium",
}: {
  action: () => Promise<void>;
  label: string;
  confirmMessage: string;
  className?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault();
      }}
    >
      <button type="submit" className={className}>
        {label}
      </button>
    </form>
  );
}
