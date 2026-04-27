import { useEffect, useMemo, useState } from "react";
import {
  PieChart,
  BarChart3,
  Activity,
  RefreshCw,
  Brain,
  AlertTriangle,
  Gauge,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  LineChart,
  Line,
} from "recharts";
import toast from "react-hot-toast";

import { emotionsApi } from "../../api/adminApi";
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

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const formatDateLabel = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const EmotionAnalyticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  const fetchSummary = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await emotionsApi.dashboardSummary({ limit: 30 });
      setSummary(response?.data || null);
    } catch (err) {
      const message = err?.message || "Failed to load emotion analytics";
      setError(message);
      toast.error(message);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const avgEmotion = summary?.averageEmotionPercentages || {};
  const latest = summary?.latest || {};
  const latestEmotion = latest?.emotionPercentages || {};
  const latestFocus = latest?.focusMetrics || {};
  const trend = Array.isArray(summary?.trend) ? summary.trend : [];

  const pieData = useMemo(
    () => [
      { name: "Happy", key: "happy", value: toNumber(latestEmotion.happy) },
      { name: "Confused", key: "confused", value: toNumber(latestEmotion.confused) },
      { name: "Frustrated", key: "frustrated", value: toNumber(latestEmotion.frustrated) },
      { name: "Angry", key: "angry", value: toNumber(latestEmotion.angry) },
      { name: "Neutral", key: "neutral", value: toNumber(latestEmotion.neutral) },
    ],
    [latestEmotion],
  );

  const barData = useMemo(
    () => [
      { emotion: "Happy", key: "happy", value: toNumber(avgEmotion.happy) },
      { emotion: "Confused", key: "confused", value: toNumber(avgEmotion.confused) },
      { emotion: "Frustrated", key: "frustrated", value: toNumber(avgEmotion.frustrated) },
      { emotion: "Angry", key: "angry", value: toNumber(avgEmotion.angry) },
      { emotion: "Neutral", key: "neutral", value: toNumber(avgEmotion.neutral) },
    ],
    [avgEmotion],
  );

  const trendData = useMemo(
    () =>
      trend.map((item) => ({
        date: formatDateLabel(item.date),
        happy: toNumber(item.happy),
        confused: toNumber(item.confused),
        frustrated: toNumber(item.frustrated),
        angry: toNumber(item.angry),
        neutral: toNumber(item.neutral),
        focus: toNumber(item.averageFocusScore),
      })),
    [trend],
  );

  const cards = [
    {
      title: "Average Focus Score",
      value: toNumber(summary?.averageFocusScore),
      suffix: " / 100",
      icon: Gauge,
      subtitle: "Last 30 days",
    },
    {
      title: "Most Difficult Topic",
      value: summary?.mostDifficultTopic || latestFocus?.mostDifficultTopic || "N/A",
      icon: AlertTriangle,
      subtitle: "Detected from emotion patterns",
    },
    {
      title: "Most Skipped Lesson",
      value: summary?.mostSkippedLesson || latestFocus?.mostSkippedLesson || "N/A",
      icon: Activity,
      subtitle: "High drop-off indicator",
    },
    {
      title: "Highest Engagement Module",
      value:
        summary?.highestEngagementModule || latestFocus?.highestEngagementModule || "N/A",
      icon: Brain,
      subtitle: "Strong learner engagement",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Emotion Analytics"
        subtitle="Track learner emotions, focus trends, and cognitive difficulty signals to improve learning outcomes."
        stats={[
          {
            label: "Records",
            value: toNumber(summary?.totalRecords),
            tone: "info",
          },
          {
            label: "Latest Snapshot",
            value: latest?.date ? new Date(latest.date).toLocaleDateString() : "N/A",
            tone: "default",
          },
        ]}
        actions={
          <button
            type="button"
            onClick={fetchSummary}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        }
      />

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <Loader label="Loading emotion analytics..." />
      ) : !summary ? (
        <EmptyState
          icon={PieChart}
          title="No emotion analytics available"
          description="No records found yet. Once analytics data is generated, charts and summaries will appear here."
        />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((item) => (
              <StatCard
                key={item.title}
                title={item.title}
                value={item.value}
                suffix={typeof item.value === "number" ? item.suffix : ""}
                subtitle={item.subtitle}
                icon={item.icon}
              />
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <div className="card lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">
                  Latest Emotion Distribution
                </h2>
                <span className="text-xs text-slate-500">Pie chart</span>
              </div>

              <div className="h-80">
                <ResponsiveContainer>
                  <RePieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={65}
                      outerRadius={105}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.key} fill={EMOTION_COLORS[entry.key]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Legend />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <h2 className="mb-4 text-base font-semibold text-slate-900">Latest Insights</h2>
              <div className="space-y-4 text-sm">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-medium text-slate-500">Most Difficult Topic</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {latestFocus?.mostDifficultTopic || summary?.mostDifficultTopic || "N/A"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-medium text-slate-500">Most Skipped Lesson</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {latestFocus?.mostSkippedLesson || summary?.mostSkippedLesson || "N/A"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-medium text-slate-500">
                    Highest Engagement Module
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {latestFocus?.highestEngagementModule ||
                      summary?.highestEngagementModule ||
                      "N/A"}
                  </p>
                </div>

                <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
                  <p className="text-xs font-medium text-indigo-700">Average Focus Score</p>
                  <p className="mt-1 text-xl font-semibold text-indigo-900">
                    {toNumber(summary?.averageFocusScore)} / 100
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="card">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">
                  Average Emotion Percentages
                </h2>
                <span className="text-xs text-slate-500">Bar chart</span>
              </div>

              <div className="h-80">
                <ResponsiveContainer>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="emotion" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {barData.map((entry) => (
                        <Cell key={entry.key} fill={EMOTION_COLORS[entry.key]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">Focus Trend</h2>
                <span className="text-xs text-slate-500">Line chart</span>
              </div>

              <div className="h-80">
                {trendData.length === 0 ? (
                  <EmptyState
                    compact
                    icon={BarChart3}
                    title="No trend data"
                    description="Trend points will appear when historical analytics are available."
                  />
                ) : (
                  <ResponsiveContainer>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="focus"
                        stroke="#4f46e5"
                        strokeWidth={2.5}
                        dot={false}
                        name="Focus Score"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </section>

          <section className="card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Emotion Trend Timeline</h2>
              <span className="text-xs text-slate-500">Multi-line trend</span>
            </div>

            <div className="h-96">
              {trendData.length === 0 ? (
                <EmptyState
                  compact
                  icon={Activity}
                  title="No timeline data"
                  description="No historical records were returned for the selected period."
                />
              ) : (
                <ResponsiveContainer>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Legend />
                    <Line type="monotone" dataKey="happy" stroke={EMOTION_COLORS.happy} dot={false} />
                    <Line type="monotone" dataKey="confused" stroke={EMOTION_COLORS.confused} dot={false} />
                    <Line type="monotone" dataKey="frustrated" stroke={EMOTION_COLORS.frustrated} dot={false} />
                    <Line type="monotone" dataKey="angry" stroke={EMOTION_COLORS.angry} dot={false} />
                    <Line type="monotone" dataKey="neutral" stroke={EMOTION_COLORS.neutral} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default EmotionAnalyticsPage;
