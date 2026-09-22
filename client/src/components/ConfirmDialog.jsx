import { useEffect, useRef } from "react";
import { TriangleAlert } from "lucide-react";

// Accessible confirm modal built on the native <dialog> element.
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  pending = false,
  onConfirm,
  onCancel,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      onClick={(event) => event.target === ref.current && onCancel()}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border border-stone-200 bg-white p-0 text-stone-900 shadow-2xl backdrop:transition dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
    >
      <div className="p-6">
        <div className="flex gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
            <TriangleAlert className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-1.5 text-sm text-stone-600 dark:text-stone-400">{description}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={pending}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={pending}>
            {pending ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
