import clsx from "clsx";
import { Search } from "lucide-react";

/**
 * Reusable page header for admin views.
 *
 * Props:
 * - title: string (required)
 * - subtitle?: string
 * - actions?: ReactNode
 * - stats?: Array<{ label: string; value: string | number; tone?: "default" | "success" | "warning" | "danger" | "info" }>
 * - showSearch?: boolean
 * - searchPlaceholder?: string
 * - searchValue?: string
 * - onSearchChange?: (value: string) => void
 * - className?: string
 */
const toneClassMap = {
  default: "bg-slate-100 text-slate-700",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-rose-100 text-rose-700",
  info: "bg-sky-100 text-sky-700",
};

const PageHeader = ({
  title,
  subtitle = "",
  actions = null,
  stats = [],
  showSearch = false,
  searchPlaceholder = "Search...",
  searchValue = "",
  onSearchChange,
  className = "",
}) => {
  return (
    <header
      className={clsx(
        "card card-elevated mb-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6",
        className
      )}
    >
      <div className="flex flex-col gap-5">
        {/* Top row */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="section-title text-2xl sm:text-3xl">{title}</h1>
            {subtitle ? (
              <p className="section-subtitle mt-2 max-w-3xl text-sm sm:text-[15px]">
                {subtitle}
              </p>
            ) : null}
          </div>

          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
          ) : null}
        </div>

        {/* Search + stats row */}
        {(showSearch || stats?.length > 0) && (
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            {showSearch ? (
              <div className="relative w-full max-w-md">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none ring-indigo-200 transition focus:border-indigo-400 focus:ring-2"
                />
              </div>
            ) : (
              <div />
            )}

            {stats?.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {stats.map((item, index) => {
                  const tone = item?.tone || "default";
                  const toneClass = toneClassMap[tone] || toneClassMap.default;

                  return (
                    <div
                      key={`${item?.label || "stat"}-${index}`}
                      className={clsx(
                        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium",
                        toneClass
                      )}
                    >
                      <span className="opacity-80">{item?.label}</span>
                      <span className="font-semibold">{item?.value}</span>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </header>
  );
};

export default PageHeader;
