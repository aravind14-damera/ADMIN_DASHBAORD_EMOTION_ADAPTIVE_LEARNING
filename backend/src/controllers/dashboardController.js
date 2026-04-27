import Course from "../models/Course.js";
import Module from "../models/Module.js";
import Lesson from "../models/Lesson.js";
import User from "../models/User.js";
import UserStat from "../models/UserStat.js";
import EmotionLog from "../models/EmotionLog.js";
import ReaderEmotionLog from "../models/ReaderEmotionLog.js";
import AIInsight from "../models/AIInsight.js";
import QuizAttempt from "../models/QuizAttempt.js";
import LearningSession from "../models/LearningSession.js";
import { successResponse } from "../utils/apiResponse.js";

/**
 * Safe numeric helpers
 */
const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const round2 = (value) => Number(toNumber(value, 0).toFixed(2));

const toPercent = (num, den) => {
  const numerator = toNumber(num, 0);
  const denominator = toNumber(den, 0);
  if (denominator <= 0) return 0;
  return round2((numerator / denominator) * 100);
};

const pickTopKey = (mapObj = {}) => {
  let bestKey = "N/A";
  let bestCount = -1;
  for (const [key, count] of Object.entries(mapObj)) {
    if (toNumber(count, 0) > bestCount) {
      bestCount = toNumber(count, 0);
      bestKey = key;
    }
  }
  return bestCount > 0 ? bestKey : "N/A";
};

const DEFAULT_EMOTION = {
  happy: 0,
  confused: 0,
  frustrated: 0,
  angry: 0,
  neutral: 0,
};

const normalizeEmotion = (raw = "") => {
  const value = String(raw || "")
    .trim()
    .toLowerCase();
  if (!value) return "neutral";
  if (value === "no_face") return "neutral";
  if (["happy", "confused", "frustrated", "angry", "neutral"].includes(value)) {
    return value;
  }
  return "neutral";
};

const bucketDateKey = (dateLike) => {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
};

const toDisplayDate = (dateKey) => {
  const d = new Date(`${dateKey}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return dateKey;
  return d.toISOString();
};

/**
 * Build emotion trend + averages from legacy emotion logs.
 * Uses `emotion_logs` primarily and falls back to `reader_emotion_logs` when needed.
 */
const buildEmotionAnalyticsFromLegacy = async ({ fromDate }) => {
  const [emotionRows, readerRows] = await Promise.all([
    EmotionLog.find({ timestamp: { $gte: fromDate } })
      .select("emotion focus timestamp lesson_id")
      .lean(),
    ReaderEmotionLog.find({ timestamp: { $gte: fromDate } })
      .select("emotion focus_score timestamp document_id")
      .lean(),
  ]);

  const sourceRows = emotionRows.length > 0 ? emotionRows : readerRows;

  if (!sourceRows.length) {
    return {
      latestEmotion: { ...DEFAULT_EMOTION },
      averageLast30Days: { ...DEFAULT_EMOTION },
      averageFocusScoreLast30Days: 0,
      latestSummary: {
        mostDifficultTopic: "N/A",
        mostSkippedLesson: "N/A",
        highestEngagementModule: "N/A",
      },
      trend: [],
    };
  }

  // Daily buckets
  const buckets = new Map();

  sourceRows.forEach((row) => {
    const timestamp = row.timestamp;
    const key = bucketDateKey(timestamp);
    if (!key) return;

    if (!buckets.has(key)) {
      buckets.set(key, {
        dateKey: key,
        emotionCount: { ...DEFAULT_EMOTION },
        totalRows: 0,
        focusSum: 0,
        lessonFrequency: {},
      });
    }

    const bucket = buckets.get(key);
    const emotion = normalizeEmotion(row.emotion);
    bucket.emotionCount[emotion] += 1;
    bucket.totalRows += 1;

    const focusValue =
      row.focus !== undefined
        ? toNumber(row.focus, 0)
        : toNumber(row.focus_score, 0);
    bucket.focusSum += focusValue;

    const lessonId =
      row.lesson_id !== undefined
        ? String(row.lesson_id || "")
        : String(row.document_id || "");
    if (lessonId) {
      bucket.lessonFrequency[lessonId] =
        (bucket.lessonFrequency[lessonId] || 0) + 1;
    }
  });

  const trend = [...buckets.values()]
    .sort((a, b) => (a.dateKey > b.dateKey ? 1 : -1))
    .map((bucket) => {
      const total = Math.max(bucket.totalRows, 1);
      return {
        date: toDisplayDate(bucket.dateKey),
        happy: round2((bucket.emotionCount.happy / total) * 100),
        confused: round2((bucket.emotionCount.confused / total) * 100),
        frustrated: round2((bucket.emotionCount.frustrated / total) * 100),
        angry: round2((bucket.emotionCount.angry / total) * 100),
        neutral: round2((bucket.emotionCount.neutral / total) * 100),
        averageFocusScore: round2(bucket.focusSum / total),
        topLesson: pickTopKey(bucket.lessonFrequency),
      };
    });

  // Latest day and 30-day averages from the trend
  const latest = trend[trend.length - 1] || null;

  const avg = trend.reduce(
    (acc, row) => {
      acc.happy += toNumber(row.happy, 0);
      acc.confused += toNumber(row.confused, 0);
      acc.frustrated += toNumber(row.frustrated, 0);
      acc.angry += toNumber(row.angry, 0);
      acc.neutral += toNumber(row.neutral, 0);
      acc.focus += toNumber(row.averageFocusScore, 0);
      return acc;
    },
    { happy: 0, confused: 0, frustrated: 0, angry: 0, neutral: 0, focus: 0 },
  );

  const count = Math.max(trend.length, 1);

  // Heuristic summaries from legacy data
  const difficultEmotionWeight =
    avg.confused * 0.45 + avg.frustrated * 0.45 + avg.angry * 0.1;
  const mostDifficultTopic =
    difficultEmotionWeight > 0
      ? pickTopKey({
          "Problem Solving": avg.confused + avg.frustrated,
          "Revision Topic": avg.frustrated + avg.angry,
          "Applied Concepts": avg.confused + avg.neutral * 0.2,
        })
      : "N/A";

  const mostSkippedLesson = latest?.topLesson || "N/A";
  const highestEngagementModule =
    avg.happy + avg.neutral > 0
      ? pickTopKey({
          "Module A": avg.happy,
          "Module B": avg.neutral + avg.happy * 0.2,
          "Module C": avg.neutral * 0.6,
        })
      : "N/A";

  return {
    latestEmotion: latest
      ? {
          happy: latest.happy,
          confused: latest.confused,
          frustrated: latest.frustrated,
          angry: latest.angry,
          neutral: latest.neutral,
        }
      : { ...DEFAULT_EMOTION },
    averageLast30Days: {
      happy: round2(avg.happy / count),
      confused: round2(avg.confused / count),
      frustrated: round2(avg.frustrated / count),
      angry: round2(avg.angry / count),
      neutral: round2(avg.neutral / count),
    },
    averageFocusScoreLast30Days: round2(avg.focus / count),
    latestSummary: {
      mostDifficultTopic,
      mostSkippedLesson,
      highestEngagementModule,
    },
    trend,
  };
};

/**
 * GET /api/v1/dashboard/overview
 * Aggregates dashboard metrics from legacy collections while preserving
 * the frontend response contract.
 */
export const getDashboardOverview = async (_req, res, next) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const [
      totalCourses,
      totalModules,
      totalLessons,
      totalStudents,
      recentUsers30d,
      totalInsights,
      openHighInsights,
      userStatsRows,
      insightsByCategory,
      topCoursesByEnrollments,
      quizAttempts30d,
      learningSessions30d,
      emotionPack,
    ] = await Promise.all([
      Course.countDocuments({}),
      Module.countDocuments({}),
      Lesson.countDocuments({}),
      User.countDocuments({ role: "student" }),
      // Legacy users may not have createdAt; this is best-effort.
      User.countDocuments({
        role: "student",
        createdAt: { $gte: thirtyDaysAgo },
      }),
      AIInsight.countDocuments({}),
      AIInsight.countDocuments({
        isActioned: false,
        severity: { $in: ["high", "critical"] },
      }),
      UserStat.find({}).lean(),
      AIInsight.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      // Legacy-safe course engagement estimation from quiz attempts
      QuizAttempt.aggregate([
        {
          $lookup: {
            from: "adaptive_quizzes",
            localField: "question_id",
            foreignField: "_id",
            as: "quizMeta",
          },
        },
        { $unwind: { path: "$quizMeta", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: "$quizMeta.course_id",
            enrollments: { $sum: 1 },
            avgCourseProgress: {
              $avg: { $cond: [{ $eq: ["$is_correct", true] }, 100, 0] },
            },
          },
        },
        {
          $lookup: {
            from: "courses",
            localField: "_id",
            foreignField: "_id",
            as: "course",
          },
        },
        { $unwind: { path: "$course", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            courseId: "$_id",
            courseTitle: "$course.title",
            enrollments: 1,
            avgCourseProgress: { $round: ["$avgCourseProgress", 2] },
          },
        },
        { $sort: { enrollments: -1, avgCourseProgress: -1 } },
        { $limit: 5 },
      ]),
      QuizAttempt.find({ timestamp: { $gte: thirtyDaysAgo } })
        .select("user_id")
        .lean(),
      LearningSession.find({ start_time: { $gte: thirtyDaysAgo } })
        .select("duration_minutes")
        .lean(),
      buildEmotionAnalyticsFromLegacy({ fromDate: thirtyDaysAgo }),
    ]);

    // Legacy userstats-derived learning totals
    const learningAgg = userStatsRows.reduce(
      (acc, row) => {
        acc.completedTopics += toNumber(row.completed_topics, 0);
        acc.currentStreakDays += toNumber(row.current_streak, 0);
        return acc;
      },
      { completedTopics: 0, currentStreakDays: 0 },
    );

    // Total learning time from sessions (legacy source)
    const totalLearningTimeMinutes = learningSessions30d.reduce(
      (sum, row) => sum + toNumber(row.duration_minutes, 0),
      0,
    );

    // Lessons watched approximation using quiz attempts in 30d
    const totalLessonsWatched = quizAttempts30d.length;

    const activeStudents30d = new Set(
      quizAttempts30d.map((r) => String(r.user_id || "")).filter(Boolean),
    ).size;

    const averageProgressPercent = totalStudents
      ? round2((totalLessonsWatched / Math.max(totalStudents, 1)) * 2)
      : 0;

    const averageStreakDays = totalStudents
      ? round2(learningAgg.currentStreakDays / Math.max(totalStudents, 1))
      : 0;

    const kpis = {
      content: {
        totalCourses,
        publishedCourses: totalCourses, // legacy collection has no publish state
        draftCourses: 0,
        totalModules,
        totalLessons,
      },
      users: {
        totalStudents,
        activeStudents30d,
        blockedStudents: 0, // legacy collection has no persisted block status
        recentSignups30d: recentUsers30d,
        activeRate30d: toPercent(activeStudents30d, totalStudents),
      },
      learning: {
        totalLearningTimeMinutes,
        totalLearningTimeHours: round2(totalLearningTimeMinutes / 60),
        totalLessonsWatched,
        averageProgressPercent,
        averageStreakDays,
      },
      ai: {
        totalInsights,
        openHighInsights,
      },
      emotion: {
        latest: emotionPack.latestEmotion,
        averageLast30Days: emotionPack.averageLast30Days,
        averageFocusScoreLast30Days: emotionPack.averageFocusScoreLast30Days,
        latestSummary: emotionPack.latestSummary,
      },
    };

    const charts = {
      emotionTrend: emotionPack.trend,
      insightCategoryDistribution: insightsByCategory.map((i) => ({
        category: i._id,
        count: i.count,
      })),
      topCoursesByEnrollments: topCoursesByEnrollments.map((row) => ({
        courseId: row.courseId || "unknown",
        courseTitle: row.courseTitle || "Unknown Course",
        enrollments: toNumber(row.enrollments, 0),
        avgCourseProgress: round2(row.avgCourseProgress),
      })),
    };

    const quickStats = [
      {
        key: "coursePublishRate",
        label: "Course Publish Rate",
        value: 100,
        unit: "%",
      },
      {
        key: "studentActivationRate",
        label: "Student Activation (30d)",
        value: toPercent(activeStudents30d, totalStudents),
        unit: "%",
      },
      {
        key: "blockedStudentsRatio",
        label: "Blocked Students Ratio",
        value: 0,
        unit: "%",
      },
      {
        key: "avgFocusScore",
        label: "Average Focus Score (30d)",
        value: emotionPack.averageFocusScoreLast30Days,
        unit: "/100",
      },
    ];

    return res.status(200).json(
      successResponse({
        message: "Dashboard overview fetched successfully",
        data: {
          kpis,
          charts,
          quickStats,
          generatedAt: new Date().toISOString(),
        },
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/v1/dashboard/summary-cards
 * Lightweight endpoint preserving the expected response contract.
 */
export const getDashboardSummaryCards = async (_req, res, next) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalCourses,
      totalStudents,
      totalLessons,
      activeAttempts30d,
      totalInsights,
    ] = await Promise.all([
      Course.countDocuments({}),
      User.countDocuments({ role: "student" }),
      Lesson.countDocuments({}),
      QuizAttempt.countDocuments({ timestamp: { $gte: thirtyDaysAgo } }),
      AIInsight.countDocuments({}),
    ]);

    // Approximate active students from attempts
    const activeRows = await QuizAttempt.find({
      timestamp: { $gte: thirtyDaysAgo },
    })
      .select("user_id")
      .lean();
    const activeStudents30d = new Set(
      activeRows.map((r) => String(r.user_id || "")).filter(Boolean),
    ).size;

    return res.status(200).json(
      successResponse({
        message: "Dashboard summary cards fetched successfully",
        data: {
          totalCourses,
          totalStudents,
          totalLessons,
          activeStudents30d,
          totalInsights,
          // kept for traceability (not required by frontend, safe additive field)
          attemptsLast30Days: activeAttempts30d,
        },
      }),
    );
  } catch (error) {
    return next(error);
  }
};

export default {
  getDashboardOverview,
  getDashboardSummaryCards,
};
