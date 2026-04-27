import { useEffect, useMemo, useState } from "react";
import {
  Clock3,
  RefreshCw,
  Flame,
  CheckCircle2,
  BookOpenCheck,
  Search,
  Timer,
} from "lucide-react";
import toast from "react-hot-toast";

import { activityApi } from "../../api/adminApi";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import EmptyState from "../../components/common/EmptyState";
import {
  formatDateTime,
  formatDurationMinutes,
  formatPercent,
} from "../../utils/format";

const PAGE_SIZE = 10;

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const StudentActivityPage = () => {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);

  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchActivitySummary = async () => {
    setSummaryLoading(true);
    try {
      const response = await activityApi.summary();
      setSummary(response?.data || null);
    } catch (error) {
      setSummary(null);
      toast.error(error?.message || "Failed to load activity summary");
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const response = await activityApi.list({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        sort: "updatedAt:desc",
      });

      const list = Array.isArray(response?.data) ? response.data : [];
      const totalCount = Number(
        response?.meta?.pagination?.total ?? list.length,
      );

      setRows(list);
      setTotal(totalCount);
    } catch (error) {
      setRows([]);
      setTotal(0);
      toast.error(error?.message || "Failed to load student activity");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  useEffect(() => {
    fetchActivitySummary();
  }, []);

  const headerStats = useMemo(
    () => [
      {
        label: "Tracked Students",
        value: summaryLoading ? "..." : toNumber(summary?.totalStudentsTracked),
        tone: "info",
      },
      {
        label: "Avg Progress",
        value: summaryLoading
          ? "..."
          : `${toNumber(summary?.avgProgressPercent).toFixed(1)}%`,
        tone: "success",
      },
      {
        label: "Page",
        value: `${page}/${totalPages}`,
        tone: "default",
      },
    ],
    [summary, summaryLoading, page, totalPages],
  );

  const summaryCards = useMemo(
    () => [
      {
        title: "Total Learning Time",
        value: summaryLoading
          ? "..."
          : `${toNumber(summary?.totalLearningTimeHours).toFixed(1)} hrs`,
        icon: Timer,
      },
      {
        title: "Lessons Watched",
        value: summaryLoading ? "..." : toNumber(summary?.totalLessonsWatched),
        icon: BookOpenCheck,
      },
      {
        title: "Avg Progress",
        value: summaryLoading
          ? "..."
          : `${toNumber(summary?.avgProgressPercent).toFixed(1)}%`,
        icon: CheckCircle2,
      },
      {
        title: "Avg Streak",
        value: summaryLoading
          ? "..."
          : `${toNumber(summary?.avgCurrentStreakDays).toFixed(1)} days`,
        icon: Flame,
      },
    ],
    [summary, summaryLoading],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Activity Tracking"
        subtitle="Monitor each student’s learning time, completion metrics, streak behavior, and engagement progress."
        showSearch
        searchValue={search}
        onSearchChange={(value) => {
          setPage(1);
          setSearch(value);
        }}
        searchPlaceholder="Search by student name or email..."
        stats={headerStats}
        actions={
          <button
            type="button"
            onClick={() => {
              fetchActivitySummary();
              fetchActivities();
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <article
              key={card.title}
              className="card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {card.title}
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                    {card.value}
                  </p>
                </div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="card overflow-hidden p-0">
        {loading ? (
          <Loader label="Loading student activity..." />
        ) : rows.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={Clock3}
              title="No student activity found"
              description={
                search
                  ? "No records match your search query."
                  : "Student activity data will appear here as learners engage with lessons."
              }
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-310 text-left">
                <thead className="bg-slate-50">
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3 font-semibold">Student</th>
                    <th className="px-5 py-3 font-semibold">
                      Total Learning Time
                    </th>
                    <th className="px-5 py-3 font-semibold">Lessons Watched</th>
                    <th className="px-5 py-3 font-semibold">
                      Completed Topics
                    </th>
                    <th className="px-5 py-3 font-semibold">Current Streak</th>
                    <th className="px-5 py-3 font-semibold">Last Login</th>
                    <th className="px-5 py-3 font-semibold">Progress</th>
                    <th className="px-5 py-3 font-semibold">Updated At</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((activity) => {
                    const user = activity.user || {};
                    const progress = Math.max(
                      0,
                      Math.min(100, toNumber(activity.progressPercent)),
                    );

                    return (
                      <tr
                        key={activity._id}
                        className="border-t border-slate-200 text-sm"
                      >
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-900">
                            {user.name || "Unknown Student"}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {user.email || "No email"}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-slate-700">
                          {formatDurationMinutes(
                            activity.totalLearningTimeMinutes,
                          )}
                        </td>

                        <td className="px-5 py-4 text-slate-700">
                          {toNumber(activity.lessonsWatched)}
                        </td>

                        <td className="px-5 py-4 text-slate-700">
                          {toNumber(activity.completedTopics)}
                        </td>

                        <td className="px-5 py-4 text-slate-700">
                          {toNumber(activity.currentStreakDays)} days
                        </td>

                        <td className="px-5 py-4 text-slate-700">
                          {formatDateTime(activity.lastLoginAt)}
                        </td>

                        <td className="px-5 py-4">
                          <div className="w-32">
                            <div className="mb-1.5 flex items-center justify-between text-xs text-slate-600">
                              <span>{formatPercent(progress, 1)}</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-200">
                              <div
                                className={`h-2 rounded-full ${
                                  progress >= 75
                                    ? "bg-emerald-500"
                                    : progress >= 45
                                      ? "bg-indigo-600"
                                      : "bg-amber-500"
                                }`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-slate-700">
                          {formatDateTime(activity.updatedAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
              <p className="text-sm text-slate-500">
                Showing{" "}
                <span className="font-medium text-slate-700">
                  {rows.length}
                </span>{" "}
                of <span className="font-medium text-slate-700">{total}</span>{" "}
                records
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Prev
                </button>

                <span className="px-2 text-sm text-slate-600">
                  {page} / {totalPages}
                </span>

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <section className="card rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <Search className="h-4.5 w-4.5 text-indigo-600" />
          <h2 className="text-base font-semibold text-slate-900">
            How to interpret this table
          </h2>
        </div>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>
            <strong>Progress</strong> indicates overall completion percentage
            across assigned learning material.
          </li>
          <li>
            <strong>Current Streak</strong> reflects consistent daily engagement
            behavior.
          </li>
          <li>
            <strong>Total Learning Time</strong> helps identify high-effort
            learners and inactive users.
          </li>
          <li>
            <strong>Last Login</strong> can be used for retention workflows and
            re-engagement campaigns.
          </li>
        </ul>
      </section>
    </div>
  );
};

export default StudentActivityPage;
