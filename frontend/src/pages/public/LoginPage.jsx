import { useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LogIn, ShieldCheck } from "lucide-react";
import { useState } from "react";
import useAuth from "../../hooks/useAuth";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .max(128, "Password is too long"),
});

const defaultValues = {
  email: "",
  password: "",
};

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading } = useAuth();

  const [showPassword, setShowPassword] = useState(false);

  const redirectTo = useMemo(() => {
    const from = location.state?.from;
    if (typeof from === "string" && from.startsWith("/")) return from;
    if (from?.pathname && typeof from.pathname === "string") return from.pathname;
    return "/admin/dashboard";
  }, [location.state]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues,
    mode: "onTouched",
  });

  const submitting = isSubmitting || isLoading;

  const onSubmit = async (values) => {
    const result = await login(values, { redirectTo });

    if (result?.ok) {
      navigate(redirectTo, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl lg:grid-cols-2">
          <div className="hidden bg-slate-900 p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-indigo-100">
                <ShieldCheck className="h-4 w-4" />
                Secure Admin Access
              </div>
              <h1 className="mt-6 text-3xl font-semibold leading-tight">
                Welcome back to your
                <span className="block text-indigo-300">Emotion Learning Admin</span>
              </h1>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300">
                Manage courses, monitor student behavior analytics, and review AI-powered
                learning insights from one central dashboard.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-slate-300">
                Tip: Use your admin credentials to securely access protected routes and
                platform controls.
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-10">
            <div className="mx-auto w-full max-w-md">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                Admin Login
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Sign in with your admin email and password.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="admin@example.com"
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
                      errors.email
                        ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                        : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100"
                    }`}
                    {...register("email")}
                  />
                  {errors.email ? (
                    <p className="mt-1.5 text-xs font-medium text-red-600">
                      {errors.email.message}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      className={`w-full rounded-xl border px-3.5 py-2.5 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
                        errors.password
                          ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                          : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100"
                      }`}
                      {...register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-slate-500 transition hover:text-slate-700"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4.5 w-4.5" />
                      ) : (
                        <Eye className="h-4.5 w-4.5" />
                      )}
                    </button>
                  </div>
                  {errors.password ? (
                    <p className="mt-1.5 text-xs font-medium text-red-600">
                      {errors.password.message}
                    </p>
                  ) : null}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <LogIn className="h-4.5 w-4.5" />
                  {submitting ? "Signing in..." : "Sign In"}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-600">
                Don’t have an admin account?{" "}
                <Link
                  to="/signup"
                  className="font-semibold text-indigo-600 transition hover:text-indigo-700"
                >
                  Create account
                </Link>
              </p>

              <div className="mt-4 text-center text-xs text-slate-400">
                <Link to="/" className="hover:text-slate-600">
                  ← Back to Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
