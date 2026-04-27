import clsx from "clsx";

const sizeMap = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-[3px]",
  lg: "h-12 w-12 border-4",
};

const textSizeMap = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

const Loader = ({
  fullScreen = false,
  size = "md",
  label = "Loading...",
  className = "",
  spinnerClassName = "",
}) => {
  const spinnerSize = sizeMap[size] || sizeMap.md;
  const labelSize = textSizeMap[size] || textSizeMap.md;

  return (
    <div
      className={clsx(
        "flex items-center justify-center",
        fullScreen ? "min-h-screen bg-slate-50" : "min-h-[180px] w-full",
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-3">
        <span
          className={clsx(
            "inline-block animate-spin rounded-full border-slate-300 border-t-indigo-600",
            spinnerSize,
            spinnerClassName
          )}
          aria-hidden="true"
        />
        {label ? <p className={clsx("font-medium text-slate-600", labelSize)}>{label}</p> : null}
      </div>
    </div>
  );
};

export default Loader;
