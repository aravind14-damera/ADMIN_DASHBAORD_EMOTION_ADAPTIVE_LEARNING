import { AlertTriangle, Loader2, X } from "lucide-react";

const ConfirmModal = ({
  isOpen = false,
  title = "Confirm Action",
  description = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  isLoading = false,
  variant = "danger", // danger | warning | info
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      iconBg: "bg-red-100",
      iconText: "text-red-600",
      confirmBtn:
        "bg-red-600 hover:bg-red-700 focus-visible:ring-red-500 disabled:bg-red-400",
    },
    warning: {
      iconBg: "bg-amber-100",
      iconText: "text-amber-600",
      confirmBtn:
        "bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-500 disabled:bg-amber-400",
    },
    info: {
      iconBg: "bg-indigo-100",
      iconText: "text-indigo-600",
      confirmBtn:
        "bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-500 disabled:bg-indigo-400",
    },
  };

  const style = variantStyles[variant] || variantStyles.danger;

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget && !isLoading) {
      onCancel?.();
    }
  };

  const handleEscape = (event) => {
    if (event.key === "Escape" && !isLoading) {
      onCancel?.();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6 backdrop-blur-[2px]"
      onClick={handleOverlayClick}
      onKeyDown={handleEscape}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-description"
      tabIndex={-1}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 rounded-full p-2 ${style.iconBg}`}
              aria-hidden="true"
            >
              <AlertTriangle className={`h-5 w-5 ${style.iconText}`} />
            </div>
            <div>
              <h3
                id="confirm-modal-title"
                className="text-base font-semibold text-slate-900"
              >
                {title}
              </h3>
              <p
                id="confirm-modal-description"
                className="mt-1 text-sm leading-relaxed text-slate-600"
              >
                {description}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Close confirmation modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`inline-flex min-w-[108px] items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed ${style.confirmBtn}`}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
