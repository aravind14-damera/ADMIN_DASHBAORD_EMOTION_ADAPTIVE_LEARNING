import { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  RefreshCw,
  Filter,
  Brain,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Wand2,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";

import { insightsApi } from "../../api/adminApi";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import EmptyState from "../../components/common/EmptyState";
import ConfirmModal from "../../components/common/ConfirmModal";

const PAGE_SIZE = 10;

const categoryOptions = [
  { label: "All Categories", value: "" },
  { label: "Engagement", value: "engagement" },
  { label: "Emotion", value: "emotion" },
  { label: "Difficulty", value: "difficulty" },
  { label: "Dropoff", value: "dropoff" },
  { label: "Recommendation", value: "recommendation" },
  { label: "Performance", value: "performance" },
];

const severityOptions = [
  { label: "All Severities", value: "" },
  { label: "Critical", value: "critical" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

const actionStatusOptions = [
  { label: "All Statuses", value: "" },
  { label: "Pending", value: "false" },
  { label: "Actioned", value: "true" },
];

const getSeverityClass = (severity) => {
  switch (severity) {
    case "critical":
      return "bg-rose-100 text-rose-700 border-rose-200";
    case "high":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "medium":
      return "bg-sky-100 text-sky-700 border-sky-200";
    default:
      return "bg-slate-200 text-slate-700 border-slate-300";
  }
};

const getCategoryClass = (category) => {
  switch (category) {
    case "emotion":
      return "bg-violet-100 text-violet-700 border-violet-200";
    case "engagement":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "difficulty":
      return "bg-rose-100 text-rose-700 border-rose-200";
    case "dropoff":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "performance":
      return "bg-cyan-100 text-cyan-700 border-cyan-200";
    default:
      return "bg-indigo-100 text-indigo-700 border-indigo-200";
  }
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
};

const AIInsightsPage = () => {
  const [insights, setInsights] = useState([]);
  const [summary, setSummary] = useState(null);

  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState("");
  const [actionStatus, setActionStatus] = useState("");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [selectedInsight, setSelectedInsight] = useState(null);
  const [actionNote, setActionNote] = useState("");

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchSummary = async () => {
    setSummaryLoading(true);
    try {
      const response = await insightsApi.summary();
      setSummary(response?.data || null);
    } catch (error) {
      setSummary(null);
      toast.error(error?.message || "Failed to load insights summary");
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const response = await insightsApi.list({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        category: category || undefined,
        severity: severity || undefined,
        isActioned: actionStatus || undefined,
        sort: "generatedAt:desc",
      });

      const list = Array.isArray(response?.data) ? response.data : [];
      const totalCount = Number(
        response?.meta?.pagination?.total ?? list.length,
      );

      setInsights(list);
      setTotal(totalCount);
    } catch (error) {
      setInsights([]);
      setTotal(0);
      toast.error(error?.message || "Failed to load AI insights");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, category, severity, actionStatus]);

  useEffect(() => {
    fetchSummary();
  }, []);

  const headerStats = useMemo(
    () => [
      {
        label: "Total Insights",
        value: summaryLoading ? "..." : toNumber(summary?.cards?.totalInsights),
        tone: "info",
      },
      {
        label: "Pending",
        value: summaryLoading
          ? "..."
          : toNumber(summary?.cards?.pendingInsights),
        tone:
          toNumber(summary?.cards?.pendingInsights) > 0 ? "warning" : "success",
      },
      {
        label: "Avg Confidence",
        value: summaryLoading
          ? "..."
          : `${toNumber(summary?.cards?.averageConfidenceScore).toFixed(1)}%`,
        tone: "default",
      },
      {
        label: "Page",
        value: `${page}/${totalPages}`,
        tone: "default",
      },
    ],
    [summary, summaryLoading, page, totalPages],
  );

  const cards = useMemo(
    () => [
      {
        title: "Total Insights",
        value: summaryLoading ? "..." : toNumber(summary?.cards?.totalInsights),
        subtitle: "All generated recommendations",
        icon: Sparkles,
      },
      {
        title: "Actioned Insights",
        value: summaryLoading
          ? "..."
          : toNumber(summary?.cards?.actionedInsights),
        subtitle: "Resolved / handled insights",
        icon: CheckCircle2,
      },
      {
        title: "Pending Insights",
        value: summaryLoading
          ? "..."
          : toNumber(summary?.cards?.pendingInsights),
        subtitle: "Require admin review",
        icon: Clock3,
      },
      {
        title: "Avg Confidence",
        value: summaryLoading
          ? "..."
          : `${toNumber(summary?.cards?.averageConfidenceScore).toFixed(1)}%`,
        subtitle: "Model confidence level",
        icon: Brain,
      },
    ],
    [summary, summaryLoading],
  );

  const openActionModal = (insight) => {
    setSelectedInsight(insight);
    setActionNote(insight?.actionNote || "");
  };

  const closeActionModal = () => {
    if (actionLoading) return;
    setSelectedInsight(null);
    setActionNote("");
  };

  const handleToggleActionStatus = async () => {
    if (!selectedInsight?._id) return;

    const nextIsActioned = !selectedInsight.isActioned;

    setActionLoading(true);
    try {
      await insightsApi.markActioned(selectedInsight._id, {
        isActioned: nextIsActioned,
        actionNote: actionNote.trim(),
      });

      toast.success(
        nextIsActioned
          ? "Insight marked as actioned"
          : "Insight moved back to pending",
      );

      closeActionModal();
      await fetchInsights();
      await fetchSummary();
    } catch (error) {
      toast.error(error?.message || "Failed to update insight status");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Insights Panel"
        subtitle="Review AI-generated learning insights, prioritize interventions, and track action outcomes with premium analytics cards."
        showSearch
        searchValue={search}
        onSearchChange={(value) => {
          setPage(1);
          setSearch(value);
        }}
        searchPlaceholder="Search title, message, or tags..."
        stats={headerStats}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-2 py-1.5">
              <Filter className="h-4 w-4 text-slate-500" />
              <select
                value={category}
                onChange={(e) => {
                  setPage(1);
                  setCategory(e.target.value);
                }}
                className="bg-transparent text-sm text-slate-700 outline-none"
              >
                {categoryOptions.map((opt) => (
                  <option key={opt.value || "all-categories"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={severity}
              onChange={(e) => {
                setPage(1);
                setSeverity(e.target.value);
              }}
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              {severityOptions.map((opt) => (
                <option key={opt.value || "all-severities"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <select
              value={actionStatus}
              onChange={(e) => {
                setPage(1);
                setActionStatus(e.target.value);
              }}
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              {actionStatusOptions.map((opt) => (
                <option key={opt.value || "all-statuses"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                fetchInsights();
                fetchSummary();
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        }
      />

      {/* Premium summary cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article
              key={card.title}
              className="card card-elevated rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {card.title}
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                    {card.value}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{card.subtitle}</p>
                </div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {/* Insights list */}
      <section className="card overflow-hidden p-0">
        {loading ? (
          <Loader label="Loading AI insights..." />
        ) : insights.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={Wand2}
              title="No AI insights found"
              description="No insights match your current filters. Try resetting search or filter criteria."
            />
          </div>
        ) : (
          <>
            <div className="grid gap-4 p-5 lg:grid-cols-2">
              {insights.map((insight) => {
                const severity = insight.severity || "low";
                const categoryValue = insight.category || "recommendation";
                const confidence = toNumber(insight.confidenceScore);

                return (
                  <article
                    key={insight._id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                  >
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getSeverityClass(
                          severity,
                        )}`}
                      >
                        {severity}
                      </span>

                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getCategoryClass(
                          categoryValue,
                        )}`}
                      >
                        {categoryValue}
                      </span>

                      <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        Confidence: {confidence.toFixed(1)}%
                      </span>
                    </div>

                    <h3 className="text-base font-semibold text-slate-900">
                      {insight.title || "Untitled Insight"}
                    </h3>

                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {insight.message || "No message available."}
                    </p>

                    {Array.isArray(insight.tags) && insight.tags.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {insight.tags.slice(0, 6).map((tag) => (
                          <span
                            key={`${insight._id}-${tag}`}
                            className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                      <div className="text-xs text-slate-500">
                        Generated:{" "}
                        {formatDateTime(
                          insight.generatedAt || insight.createdAt,
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => openActionModal(insight)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                          insight.isActioned
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                        }`}
                      >
                        {insight.isActioned ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Actioned
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Pending
                          </>
                        )}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
              <p className="text-sm text-slate-500">
                Showing{" "}
                <span className="font-medium text-slate-700">
                  {insights.length}
                </span>{" "}
                of <span className="font-medium text-slate-700">{total}</span>{" "}
                insights
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

      {/* Action modal */}
      <ConfirmModal
        isOpen={Boolean(selectedInsight)}
        title={
          selectedInsight?.isActioned
            ? "Mark Insight as Pending"
            : "Mark Insight as Actioned"
        }
        description={
          selectedInsight?.isActioned
            ? `Move "${selectedInsight?.title || "this insight"}" back to pending state?`
            : `Mark "${selectedInsight?.title || "this insight"}" as actioned after review?`
        }
        confirmText={
          selectedInsight?.isActioned ? "Mark Pending" : "Mark Actioned"
        }
        cancelText="Cancel"
        onConfirm={handleToggleActionStatus}
        onCancel={closeActionModal}
        isLoading={actionLoading}
        variant={selectedInsight?.isActioned ? "warning" : "info"}
      />
    </div>
  );
};

export default AIInsightsPage;
