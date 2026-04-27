import { useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  Boxes,
  PlayCircle,
  Users,
  ActivitySquare,
  Clock3,
  BrainCircuit,
  Settings,
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  GraduationCap,
} from "lucide-react";
import { useSelector } from "react-redux";
import useAuth from "../../hooks/useAuth";

const navItems = [
  { label: "Dashboard Overview", to: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Courses", to: "/admin/courses", icon: BookOpen },
  { label: "Modules", to: "/admin/modules", icon: Boxes },
  { label: "Lessons", to: "/admin/lessons", icon: PlayCircle },
  { label: "Users", to: "/admin/users", icon: Users },
  { label: "Emotion Analytics", to: "/admin/emotion-analytics", icon: ActivitySquare },
  { label: "Student Activity", to: "/admin/student-activity", icon: Clock3 },
  { label: "AI Insights", to: "/admin/ai-insights", icon: BrainCircuit },
  { label: "Settings", to: "/admin/settings", icon: Settings },
];

const getPageTitle = (pathname) => {
  const matched = navItems.find((item) => pathname.startsWith(item.to));
  return matched ? matched.label : "Admin Dashboard";
};

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, admin } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchText, setSearchText] = useState("");

  const authState = useSelector((state) => state.auth);
  const profile = admin || authState?.user || {
    name: "Admin",
    email: "admin@example.com",
    role: "admin",
  };

  const pageTitle = useMemo(() => getPageTitle(location.pathname), [location.pathname]);

  const handleLogout = async () => {
    const result = await logout({ redirectTo: null });
    if (result?.ok) {
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Mobile overlay */}
      {isSidebarOpen ? (
        <button
          aria-label="Close sidebar overlay"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
        />
      ) : null}

      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={[
            "fixed inset-y-0 left-0 z-50 w-72 shrink-0 border-r border-slate-200 bg-white transition-transform duration-300 lg:static lg:translate-x-0",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
            <Link to="/admin/dashboard" className="flex items-center gap-2">
              <div className="rounded-lg bg-indigo-600 p-2 text-white">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">EmotionLearn</p>
                <p className="text-xs text-slate-500">Admin Portal</p>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="rounded-md p-1 text-slate-500 hover:bg-slate-100 lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="h-[calc(100vh-64px)] overflow-y-auto px-3 py-4">
            <ul className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === "/admin/dashboard"}
                      onClick={() => setIsSidebarOpen(false)}
                      className={({ isActive }) =>
                        [
                          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                          isActive
                            ? "bg-indigo-50 text-indigo-700"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                        ].join(" ")
                      }
                    >
                      <Icon className="h-4.5 w-4.5" />
                      <span>{item.label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>

            <div className="mt-6 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
              >
                <LogOut className="h-4.5 w-4.5" />
                <span>Logout</span>
              </button>
            </div>
          </nav>
        </aside>

        {/* Main panel */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Topbar */}
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
                aria-label="Open sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-slate-900">{pageTitle}</p>
                <p className="hidden text-xs text-slate-500 sm:block">
                  AI-Powered Emotion-Based Learning Platform
                </p>
              </div>

              <div className="hidden items-center md:flex">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Search..."
                    className="h-9 w-56 rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none ring-indigo-500 placeholder:text-slate-400 focus:ring-2"
                  />
                </div>
              </div>

              <button
                type="button"
                className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute right-1.5 top-1.5 inline-flex h-2 w-2 rounded-full bg-rose-500" />
              </button>

              <div className="ml-1 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                  {String(profile?.name || "A")
                    .trim()
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <div className="hidden max-w-[180px] sm:block">
                  <p className="truncate text-sm font-medium leading-tight text-slate-800">
                    {profile?.name || "Admin"}
                  </p>
                  <p className="truncate text-xs text-slate-500">{profile?.email || "admin"}</p>
                </div>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 p-4 sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
