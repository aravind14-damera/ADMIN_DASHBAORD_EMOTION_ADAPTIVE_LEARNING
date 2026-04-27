import { Inbox } from "lucide-react";
import clsx from "clsx";

const EmptyState = ({
  title = "No data found",
  description = "There’s nothing to show here yet.",
  icon,
  action = null,
  className = "",
  compact = false,
}) => {
  const IconComponent = icon || Inbox;

  return (
    <div
      className={clsx(
        "card flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 text-center",
        compact ? "px-4 py-8" : "px-6 py-12",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <IconComponent className="h-7 w-7" aria-hidden="true" />
      </div>

      <h3
        className={clsx(
          "font-semibold text-slate-900",
          compact ? "text-base" : "text-lg",
        )}
      >
        {title}
      </h3>

      <p
        className={clsx(
          "mt-2 max-w-xl text-slate-500",
          compact ? "text-sm" : "text-[15px]",
        )}
      >
        {description}
      </p>

      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
};

export default EmptyState;
