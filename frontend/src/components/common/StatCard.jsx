import clsx from "clsx";
import { TrendingDown, TrendingUp } from "lucide-react";

const formatValue = (value, suffix = "") => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    return `${new Intl.NumberFormat("en-US").format(value)}${suffix}`;
  }
  return `${value}${suffix}`;
};

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  suffix = "",
  className = "",
  valueClassName = "",
  iconClassName = "",
  loading = false,
}) => {
  const hasTrend = typeof trend === "number";
  const isTrendUp = hasTrend && trend >= 0;

  return (
    <div
      className={clsx(
        "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>

          {loading ? (
            <div className="mt-3 h-8 w-24 animate-pulse rounded bg-slate-200" />
          ) : (
            <h3
              className={clsx(
                "mt-2 truncate text-2xl font-semibold tracking-tight text-slate-900",
                valueClassName
              )}
            >
              {formatValue(value, suffix)}
            </h3>
          )}

          {subtitle ? (
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          ) : null}
        </div>

        {Icon ? (
          <div
            className={clsx(
              "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600",
              iconClassName
            )}
            aria-hidden="true"
          >
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>

      {hasTrend ? (
        <div className="mt-4 flex items-center gap-2">
          <span
            className={clsx(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
              isTrendUp
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700"
            )}
          >
            {isTrendUp ? (
              <TrendingUp className="mr-1 h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="mr-1 h-3.5 w-3.5" />
            )}
            {Math.abs(trend).toFixed(1)}%
          </span>

          {trendLabel ? (
            <span className="text-xs text-slate-500">{trendLabel}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default StatCard;
