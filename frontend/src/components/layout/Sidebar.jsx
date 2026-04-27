import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  FolderKanban,
  PlayCircle,
  Users,
  PieChart,
  Activity,
  Sparkles,
  Settings,
  LogOut,
  Brain,
} from "lucide-react";
import clsx from "clsx";

const navItems = [
  { label: "Dashboard Overview", path: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Courses", path: "/admin/courses", icon: BookOpen },
  { label: "Modules", path: "/admin/modules", icon: FolderKanban },
  { label: "Lessons", path: "/admin/lessons", icon: PlayCircle },
  { label: "Users", path: "/admin/users", icon: Users },
  { label: "Emotion Analytics", path: "/admin/emotion-analytics", icon: PieChart },
  { label: "Student Activity", path: "/admin/student-activity", icon: Activity },
  { label: "AI Insights", path: "/admin/ai-insights", icon: Sparkles },
  { label: "Settings", path: "/admin/settings", icon: Settings },
];

const Sidebar = ({ onLogout, collapsed = false, className = "" }) => {
  const location = useLocation();

  return (
    <aside
      className={clsx(
        "flex h-screen flex-col border-r border-slate-200 bg-white/95 backdrop-blur-md",
        collapsed ? "w-[88px]" : "w-[280px]",
        className
      )}
    >
      {/* Brand */}
      <div className="flex h-20 items-center border-b border-slate-200 px-5">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md">
            <Brain className="h-6 w-6" />
          </div>
          {!collapsed ? (
            <div>
              <h1 className="text-sm font-bold tracking-wide text-slate-900">
                Emotion Learning
              </h1>
              <p className="text-xs text-slate-500">Admin Dashboard</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              location.pathname.startsWith(`${item.path}/`);

            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive: navActive }) =>
                    clsx(
                      "group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                      collapsed ? "justify-center" : "gap-3",
                      navActive || isActive
                        ? "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )
                  }
                  title={collapsed ? item.label : undefined}
                >
                  <Icon
                    className={clsx(
                      "h-5 w-5 shrink-0",
                      isActive ? "text-indigo-600" : "text-slate-500 group-hover:text-slate-700"
                    )}
                  />
                  {!collapsed ? <span className="truncate">{item.label}</span> : null}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer / Logout */}
      <div className="border-t border-slate-200 p-3">
        <button
          type="button"
          onClick={onLogout}
          className={clsx(
            "flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50 hover:text-rose-700",
            collapsed ? "justify-center" : "gap-3"
          )}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed ? <span>Logout</span> : null}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
