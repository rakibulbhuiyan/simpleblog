import { Link } from "react-router";
import { LoaderCircle } from "lucide-react";

import { cn } from "../lib/utils.js";

export function Spinner({ className }) {
  return <LoaderCircle className={cn("size-5 animate-spin text-stone-400", className)} aria-hidden="true" />;
}

export function PageSpinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading">
      <Spinner className="size-7" />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-3xl border border-dashed border-stone-300 px-6 py-14 text-center dark:border-stone-700",
        className
      )}
    >
      {Icon && (
        <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
          <Icon className="size-6" />
        </span>
      )}
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-stone-600 dark:text-stone-400">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <EmptyState
      title="Something went wrong"
      description={error?.message ?? "We couldn't load this content."}
      action={
        onRetry ? (
          <button type="button" className="btn btn-secondary" onClick={onRetry}>
            Try again
          </button>
        ) : (
          <Link to="/" className="btn btn-secondary">
            Back home
          </Link>
        )
      }
    />
  );
}
