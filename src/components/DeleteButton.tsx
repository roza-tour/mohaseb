"use client";

export function DeleteButton({
  action,
  confirmMessage = "هل أنت متأكد من الحذف؟ لا يمكن التراجع عن هذا الإجراء.",
  label = "حذف",
}: {
  action: () => Promise<void>;
  confirmMessage?: string;
  label?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault();
      }}
    >
      <button type="submit" className="text-xs text-red-600 hover:underline">
        {label}
      </button>
    </form>
  );
}
