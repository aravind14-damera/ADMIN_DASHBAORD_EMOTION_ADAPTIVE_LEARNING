import { useEffect, useMemo, useState } from "react";
import { BookOpen, Users, PlayCircle, Sparkles, Brain, Activity } from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
  LineChart,
  Line,
} from "recharts";

import { dashboardApi, emotionsApi, insightsApi } from "../../api/adminApi";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/common/StatCard";
import Loader from "../../components/common/Loader";
import EmptyState from "../../components/common/EmptyState";

const EMOTION_COLORS = {
  happy: "#10b981",
  confused: "#f59e0b",
  frustrated: "#ef4444",
  angry: "#b91c1c",
  neutral: "#64748b",
};

const safeNum = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);

const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState("");

  const [overview, setOverview] = useState(null);
  const [summaryCards, setSummaryCards] = useState(null);
  const [latestInsights, setLatestInsights] = useState([]);
  const [emotionSummary, setEmotionSummary] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError("");

    try {
      const [overviewRes, insightsRes, emotionRes] = await Promise.all([
        dashboardApi.getOverview(),
        insightsApi.latest(6),
        emotionsApi.dashboardSummary({ limit: 30 }),
      ]);

      setOverview(overviewRes?.data || null);
      setLatestInsights(insightsRes?.data || []);
      setEmotionSummary(emotionRes?.data || null);
    } catch (err) {
      setError(err?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const fetchSummaryCards = async () => {
    setSummaryLoading(true);
    try {
      const res = await dashboardApi.getSummaryCards();
      setSummaryCards(res?.data || null);
    } catch {
      setSummaryCards(null);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchSummaryCards();
  }, []);

  const kpi = overview?.kpis || {};
  const charts = overview?.charts || {};

  const topCards = useMemo(() => {
    const summary = summaryCards || {};
    return [
      {
        title: "Total Courses",
        value: safeNum(summary.totalCourses ?? kpi?.content?.totalCourses),
        icon: BookOpen,
        subtitle: "Published + draft courses",
      },
      {
        title: "Total Students",
        value: safeNum(summary.totalStudents ?? kpi?.users?.totalStudents),
        icon: Users,
        subtitle: "Registered learners",
      },
      {
        title: "Total Lessons",
        value: safeNum(summary.totalLessons ?? kpi?.content?.totalLessons),
        icon: PlayCircle,
        subtitle: "Lessons across all modules",
      },
      {
        title: "AI Insights",
        value: safeNum(summary.totalInsights ?? kpi?.ai?.totalInsights),
        icon: Sparkles,
        subtitle: "Generated recommendations",
      },
    ];
  }, [summaryCards, kpi]);

  const emotionPieData = useMemo(() => {
    const emotion = kpi?.emotion?.latest || emotionSummary?.latest?.emotionPercentages || {};
    return [
      { name: "Happy", key: "happy", value: safeNum(emotion.happy) },
      { name: "Confused", key: "confused", value: safeNum(emotion.confused) },
      { name: "Frustrated", key: "frustrated", value: safeNum(emotion.frustrated) },
      { name: "Angry", key: "angry", value: safeNum(emotion.angry) },
      { name: "Neutral", key: "neutral", value: safeNum(emotion.neutral) },
    ];
  }, [kpi, emotionSummary]);

  const emotionBarData = useMemo(() => {
    const avg = kpi?.emotion?.averageLast30Days || emotionSummary?.averageEmotionPercentages || {};
    return [
      { emotion: "Happy", value: safeNum(avg.happy) },
      { emotion: "Confused", value: safeNum(avg.confused) },
      { emotion: "Frustrated", value: safeNum(avg.frustrated) },
      { emotion: "Angry", value: safeNum(avg.angry) },
      { emotion: "Neutral", value: safeNum(avg.neutral) },
    ];
  }, [kpi, emotionSummary]);

  const emotionTrend = useMemo(
    () =>
      (charts?.emotionTrend || []).map((item) => ({
        date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        focus: safeNum(item.averageFocusScore),
      })),
    [charts]
  );

  const courseEngagementData = useMemo(
    () =>
      (charts?.topCoursesByEnrollments || []).map((item) => ({
        name: item.courseTitle || "Unknown",
        enrollments: safeNum(item.enrollments),
        progress: safeNum(item.avgCourseProgress),
      })),
    [charts]
  );

  if (loading && !overview) {
    return <Loader fullScreen label="Loading dashboard..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Overview"
        subtitle="Monitor platform performance, student behavior, emotion analytics, and AI recommendations in real time."
        actions={
          <button
            type="button"
            onClick={fetchDashboardData}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Refresh Data
          </button>
        }
        stats={[
          {
            label: "Active Students (30d)",
            value: `${safeNum(kpi?.users?.activeStudents30d)} / ${safeNum(kpi?.users?.totalStudents)}`,
            tone: "info",
          },
          {
            label: "Open High Insights",
            value: safeNum(kpi?.ai?.openHighInsights),
            tone: safeNum(kpi?.ai?.openHighInsights) > 0 ? "warning" : "success",
          },
        ]}
      />

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {topCards.map((card) => (
          <StatCard
            key={card.title}
            title={card.title}
            value={card.value}
            subtitle={card.subtitle}
            icon={card.icon}
            loading={summaryLoading}
          />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Emotion Distribution (Latest)</h2>
            <span className="text-xs text-slate-500">Pie chart</span>
          </div>
          <div className="h-80">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={emotionPieData} dataKey="value" nameKey="name" innerRadius={65} outerRadius={105}>
                  {emotionPieData.map((entry) => (
                    <Cell key={entry.key} fill={EMOTION_COLORS[entry.key]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Focus & Summary</h2>
          <div className="space-y-4">
            <div className="rounded-xl bg-indigo-50 p-4">
              <p className="text-xs font-medium text-indigo-700">Average Focus Score</p>
              <p className="mt-1 text-2xl font-semibold text-indigo-900">
                {safeNum(kpi?.emotion?.averageFocusScoreLast30Days)} / 100
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <div>
                <p className="font-medium text-slate-700">Most difficult topic</p>
                <p className="text-slate-500">{kpi?.emotion?.latestSummary?.mostDifficultTopic || "N/A"}</p>
              </div>
              <div>
                <p className="font-medium text-slate-700">Most skipped lesson</p>
                <p className="text-slate-500">{kpi?.emotion?.latestSummary?.mostSkippedLesson || "N/A"}</p>
              </div>
              <div>
                <p className="font-medium text-slate-700">Highest engagement module</p>
                <p className="text-slate-500">
                  {kpi?.emotion?.latestSummary?.highestEngagementModule || "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Emotion Averages (Last 30 Days)</h2>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={emotionBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="emotion" />
                <YAxis />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {emotionBarData.map((item, idx) => (
                    <Cell
                      key={`${item.emotion}-${idx}`}
                      fill={EMOTION_COLORS[item.emotion.toLowerCase()]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Focus Trend</h2>
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={emotionTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="focus" stroke="#4f46e5" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Top Course Engagement</h2>
          {courseEngagementData.length === 0 ? (
            <EmptyState title="No engagement data yet" compact />
          ) : (
            <div className="h-80">
              <ResponsiveContainer>
                <BarChart data={courseEngagementData} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={140} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="enrollments" fill="#06b6d4" radius={[0, 8, 8, 0]} />
                  <Bar dataKey="progress" fill="#4f46e5" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Latest AI Insights</h2>
          {latestInsights.length === 0 ? (
            <EmptyState title="No AI insights available" icon={Brain} compact />
          ) : (
            <div className="space-y-3">
              {latestInsights.map((insight) => (
                <article
                  key={insight._id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{insight.title}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        insight.severity === "critical"
                          ? "bg-rose-100 text-rose-700"
                          : insight.severity === "high"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {insight.severity}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{insight.message}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="card">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
          <Activity className="h-4.5 w-4.5 text-indigo-600" />
          Learning Activity Snapshot
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Total Learning Time</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {safeNum(kpi?.learning?.totalLearningTimeHours)} hrs
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Lessons Watched</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {safeNum(kpi?.learning?.totalLessonsWatched)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Average Progress</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {safeNum(kpi?.learning?.averageProgressPercent)}%
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Average Streak</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {safeNum(kpi?.learning?.averageStreakDays)} days
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
