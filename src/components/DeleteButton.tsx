"use client";

import { FormButton } from "@/components/FormButton";

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
      <FormButton className="text-xs text-red-600 hover:underline">
        {label}
      </FormButton>
    </form>
  );
}
