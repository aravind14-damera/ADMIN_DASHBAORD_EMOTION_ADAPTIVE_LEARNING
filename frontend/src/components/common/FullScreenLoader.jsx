import Loader from "./Loader";

const FullScreenLoader = ({
  message = "Loading...",
  showBrand = true,
  className = "",
}) => {
  return (
    <div
      className={`fixed inset-0 z-[9999] flex min-h-screen w-full items-center justify-center bg-slate-950/50 backdrop-blur-sm ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        {showBrand ? (
          <div className="mb-5 text-center">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">
              Emotion Learning Admin
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Preparing your dashboard
            </p>
          </div>
        ) : null}

        <Loader
          size="lg"
          label={message}
          className="min-h-[120px] bg-transparent"
          spinnerClassName="border-slate-300 border-t-indigo-600"
        />
      </div>
    </div>
  );
};

export default FullScreenLoader;
