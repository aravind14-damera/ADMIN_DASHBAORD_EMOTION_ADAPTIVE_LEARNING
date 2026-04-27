import { Link } from "react-router-dom";
import {
  BrainCircuit,
  BarChart3,
  Sparkles,
  Users,
  Video,
  ShieldCheck,
  ChevronRight,
  Rocket,
} from "lucide-react";

const features = [
  {
    title: "Smart Course Management",
    description:
      "Create, organize, and scale courses, modules, and lessons with a clean workflow built for modern ed-tech teams.",
    icon: Rocket,
  },
  {
    title: "Emotion Analytics",
    description:
      "Track learner emotions in real-time to uncover confusion points, frustration spikes, and engagement trends.",
    icon: BarChart3,
  },
  {
    title: "AI Learning Insights",
    description:
      "Get actionable AI-generated recommendations to improve retention, lesson quality, and learning outcomes.",
    icon: Sparkles,
  },
  {
    title: "Student Progress Tracking",
    description:
      "Monitor activity, streaks, completion rates, and learning time across every student from one dashboard.",
    icon: Users,
  },
  {
    title: "Video Lesson Management",
    description:
      "Upload and manage lesson videos with cloud-ready architecture that supports production growth.",
    icon: Video,
  },
];

const whyChooseUs = [
  "Built for real production usage, not demo-level admin panels",
  "Data-driven decisions powered by behavioral and emotion signals",
  "Scalable architecture ready for feature expansion and integrations",
  "Security-first authentication and protected admin workflows",
];

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-112 w-md -translate-x-1/2 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-72 w-72 rounded-full bg-purple-500/20 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10">
        <div className="page-container flex h-20 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/10 p-2">
              <BrainCircuit className="h-6 w-6 text-indigo-300" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold tracking-tight">
                EmotionLearn Admin
              </p>
              <p className="text-xs text-slate-300">
                AI-powered learning intelligence
              </p>
            </div>
          </div>

          <nav className="hidden items-center gap-3 sm:flex">
            <Link
              to="/login"
              className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
            >
              Signup
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 py-20 sm:py-24">
        <div className="page-container">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-300/30 bg-indigo-300/10 px-4 py-1.5 text-xs font-medium text-indigo-200">
              <ShieldCheck className="h-4 w-4" />
              Production-Ready Admin SaaS Experience
            </div>

            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              AI-Powered Emotion-Based Learning Platform
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Track student emotions, improve learning outcomes, and manage
              educational content intelligently through a professional,
              analytics-first admin dashboard.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400"
              >
                Login
                <ChevronRight className="ml-1.5 h-4 w-4" />
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center justify-center rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Signup
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 pb-16">
        <div className="page-container">
          <div className="mb-8">
            <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Platform Features
            </h2>
            <p className="mt-2 text-sm text-slate-300 sm:text-base">
              Everything an admin team needs to run an intelligent learning
              system.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-indigo-300/40 hover:bg-white/10"
                >
                  <div className="mb-4 inline-flex rounded-xl bg-indigo-400/15 p-2.5">
                    <Icon className="h-5 w-5 text-indigo-200" />
                  </div>
                  <h3 className="text-base font-semibold text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    {feature.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="relative z-10 pb-20">
        <div className="page-container">
          <div className="rounded-2xl border border-indigo-300/20 bg-linear-to-br from-indigo-500/15 to-cyan-500/10 p-6 sm:p-8">
            <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Why Choose Us
            </h2>
            <p className="mt-2 text-sm text-slate-300 sm:text-base">
              Designed to feel like a real funded ed-tech SaaS product.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {whyChooseUs.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="mt-0.5 rounded-full bg-emerald-400/20 p-1">
                    <ShieldCheck className="h-4 w-4 text-emerald-300" />
                  </div>
                  <p className="text-sm text-slate-200">{item}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/login"
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Get Started
              </Link>
              <Link
                to="/signup"
                className="rounded-lg border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Create Admin Account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10">
        <div className="page-container flex flex-col items-start justify-between gap-4 py-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-white">
              EmotionLearn Admin Dashboard
            </p>
            <p className="mt-1 text-xs text-slate-400">
              © {new Date().getFullYear()} EmotionLearn. All rights reserved.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>Secure Auth</span>
            <span>•</span>
            <span>Cloud Media Ready</span>
            <span>•</span>
            <span>Analytics First</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
