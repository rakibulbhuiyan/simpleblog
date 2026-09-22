import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { CircleAlert, CircleCheck, X } from "lucide-react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (type, message) => {
      const id = ++nextId.current;
      setToasts((current) => [...current.slice(-2), { id, type, message }]);
      setTimeout(() => dismiss(id), type === "error" ? 5000 : 3200);
    },
    [dismiss]
  );

  const toast = useMemo(
    () => ({
      success: (message) => show("success", message),
      error: (message) => show("error", message),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:right-4 sm:left-auto sm:items-end"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            role="status"
            className="pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-3 rounded-2xl border border-stone-200 bg-white/95 p-3.5 pr-2.5 text-sm shadow-lg shadow-stone-900/10 backdrop-blur dark:border-stone-700 dark:bg-stone-900/95 dark:shadow-black/40"
          >
            {item.type === "error" ? (
              <CircleAlert className="mt-px size-[18px] shrink-0 text-red-500" />
            ) : (
              <CircleCheck className="mt-px size-[18px] shrink-0 text-emerald-500" />
            )}
            <p className="flex-1 text-stone-700 dark:text-stone-200">{item.message}</p>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="rounded-md p-0.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              aria-label="Dismiss notification"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
