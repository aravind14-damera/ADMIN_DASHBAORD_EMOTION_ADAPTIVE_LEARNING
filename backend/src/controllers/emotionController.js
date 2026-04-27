import EmotionLog from "../models/EmotionLog.js";
import ReaderEmotionLog from "../models/ReaderEmotionLog.js";
import AppError from "../utils/AppError.js";
import { successResponse, paginatedResponse } from "../utils/apiResponse.js";

/**
 * Helpers
 */
const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const round2 = (value) => Number(toNumber(value, 0).toFixed(2));

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

const parseDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const getPagination = (query = {}) => {
  const pageRaw = Number(query.page);
  const limitRaw = Number(query.limit);

  const page =
    Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.min(Math.floor(limitRaw), 100)
      : 10;

  return { page, limit, skip: (page - 1) * limit };
};

const getDateRangeFilter = (query = {}, dateField = "timestamp") => {
  const filter = {};
  const date = {};

  const from = parseDate(query.from);
  const to = parseDate(query.to);

  if (from) date.$gte = from;
  if (to) date.$lte = to;

  if (Object.keys(date).length) {
    filter[dateField] = date;
  }

  return filter;
};

const formatDateKey = (dateLike) => {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
};

const pickTop = (mapObj = {}) => {
  let best = "N/A";
  let bestCount = -1;

  for (const [k, v] of Object.entries(mapObj)) {
    if (toNumber(v, 0) > bestCount) {
      bestCount = toNumber(v, 0);
      best = k;
    }
  }

  return bestCount > 0 ? best : "N/A";
};

const mapLegacyRowToUnified = (row) => {
  // emotion_logs shape
  if (row.focus !== undefined || row.lesson_id !== undefined) {
    return {
      _id: row._id,
      timestamp: row.timestamp,
      emotion: normalizeEmotion(row.emotion),
      focus: toNumber(row.focus, 0),
      lessonRef: row.lesson_id || "",
      userRef: row.user_id || "",
      source: "emotion_logs",
    };
  }

  // reader_emotion_logs fallback shape
  return {
    _id: row._id,
    timestamp: row.timestamp,
    emotion: normalizeEmotion(row.emotion),
    focus: toNumber(row.focus_score, 0),
    lessonRef: row.document_id || "",
    userRef: row.user_id || "",
    source: "reader_emotion_logs",
  };
};

const buildDailyAggregate = (rows = []) => {
  const bucketMap = new Map();

  rows.forEach((raw) => {
    const row = mapLegacyRowToUnified(raw);
    const key = formatDateKey(row.timestamp);
    if (!key) return;

    if (!bucketMap.has(key)) {
      bucketMap.set(key, {
        dateKey: key,
        count: 0,
        focusSum: 0,
        emotions: { ...DEFAULT_EMOTION },
        lessonFrequency: {},
      });
    }

    const bucket = bucketMap.get(key);
    bucket.count += 1;
    bucket.focusSum += toNumber(row.focus, 0);
    bucket.emotions[row.emotion] =
      toNumber(bucket.emotions[row.emotion], 0) + 1;

    if (row.lessonRef) {
      bucket.lessonFrequency[row.lessonRef] =
        toNumber(bucket.lessonFrequency[row.lessonRef], 0) + 1;
    }
  });

  return [...bucketMap.values()]
    .sort((a, b) => (a.dateKey > b.dateKey ? 1 : -1))
    .map((bucket) => {
      const total = Math.max(bucket.count, 1);
      return {
        date: new Date(`${bucket.dateKey}T00:00:00.000Z`),
        emotionPercentages: {
          happy: round2((bucket.emotions.happy / total) * 100),
          confused: round2((bucket.emotions.confused / total) * 100),
          frustrated: round2((bucket.emotions.frustrated / total) * 100),
          angry: round2((bucket.emotions.angry / total) * 100),
          neutral: round2((bucket.emotions.neutral / total) * 100),
        },
        focusMetrics: {
          averageFocusScore: round2(bucket.focusSum / total),
          mostDifficultTopic: "N/A",
          mostSkippedLesson: pickTop(bucket.lessonFrequency),
          highestEngagementModule: "N/A",
        },
        generatedBy: "system",
        notes: `Aggregated from legacy logs (${total} samples)`,
        _meta: {
          count: total,
        },
      };
    });
};

const mapAnalytics = (doc) => ({
  _id: doc._id,
  date: doc.date,
  emotionPercentages: {
    happy: toNumber(doc.emotionPercentages?.happy, 0),
    confused: toNumber(doc.emotionPercentages?.confused, 0),
    frustrated: toNumber(doc.emotionPercentages?.frustrated, 0),
    angry: toNumber(doc.emotionPercentages?.angry, 0),
    neutral: toNumber(doc.emotionPercentages?.neutral, 0),
  },
  focusMetrics: {
    averageFocusScore: toNumber(doc.focusMetrics?.averageFocusScore, 0),
    mostDifficultTopic: doc.focusMetrics?.mostDifficultTopic || "N/A",
    mostSkippedLesson: doc.focusMetrics?.mostSkippedLesson || "N/A",
    highestEngagementModule: doc.focusMetrics?.highestEngagementModule || "N/A",
  },
  generatedBy: doc.generatedBy || "system",
  notes: doc.notes || "",
  createdAt: doc.createdAt || null,
  updatedAt: doc.updatedAt || null,
});

/**
 * Fetch legacy rows from emotion_logs; fallback to reader_emotion_logs if empty.
 */
const fetchLegacyRows = async (query = {}) => {
  const emotionFilter = getDateRangeFilter(query, "timestamp");
  const fromEmotionLogs = await EmotionLog.find(emotionFilter)
    .sort({ timestamp: -1 })
    .lean();

  if (fromEmotionLogs.length > 0) return fromEmotionLogs;

  const readerFilter = getDateRangeFilter(query, "timestamp");
  const fromReaderLogs = await ReaderEmotionLog.find(readerFilter)
    .sort({ timestamp: -1 })
    .lean();

  return fromReaderLogs;
};

/**
 * @desc    List emotion analytics (paginated + date filter)
 * @route   GET /api/v1/emotions
 * @access  Private (Admin)
 */
export const getEmotionAnalytics = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);

    const rows = await fetchLegacyRows(req.query);
    const daily = buildDailyAggregate(rows);

    const total = daily.length;
    const paged = daily.slice(skip, skip + limit);

    return res.status(200).json(
      paginatedResponse({
        message: "Emotion analytics fetched successfully",
        data: paged.map(mapAnalytics),
        page,
        limit,
        total,
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Get latest emotion analytics
 * @route   GET /api/v1/emotions/latest
 * @access  Private (Admin)
 */
export const getLatestEmotionAnalytics = async (req, res, next) => {
  try {
    const rows = await fetchLegacyRows(req.query);
    const daily = buildDailyAggregate(rows);

    if (!daily.length) {
      throw AppError.notFound("No emotion analytics found");
    }

    const latest = daily[daily.length - 1];

    return res.status(200).json(
      successResponse({
        message: "Latest emotion analytics fetched successfully",
        data: mapAnalytics(latest),
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Create emotion analytics
 * @route   POST /api/v1/emotions
 * @access  Private (Admin)
 *
 * For legacy mode we don't persist synthetic analytics rows.
 * We keep API compatibility and return accepted payload with normalized shape.
 */
export const createEmotionAnalytics = async (req, res, next) => {
  try {
    const payload = req.body || {};

    const doc = {
      _id: null,
      date: payload.date ? new Date(payload.date) : new Date(),
      emotionPercentages: {
        happy: toNumber(payload.emotionPercentages?.happy, 0),
        confused: toNumber(payload.emotionPercentages?.confused, 0),
        frustrated: toNumber(payload.emotionPercentages?.frustrated, 0),
        angry: toNumber(payload.emotionPercentages?.angry, 0),
        neutral: toNumber(payload.emotionPercentages?.neutral, 0),
      },
      focusMetrics: {
        averageFocusScore: toNumber(payload.focusMetrics?.averageFocusScore, 0),
        mostDifficultTopic: payload.focusMetrics?.mostDifficultTopic || "N/A",
        mostSkippedLesson: payload.focusMetrics?.mostSkippedLesson || "N/A",
        highestEngagementModule:
          payload.focusMetrics?.highestEngagementModule || "N/A",
      },
      generatedBy: payload.generatedBy || "manual",
      notes:
        payload.notes || "Accepted in legacy aggregate mode (not persisted).",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return res.status(201).json(
      successResponse({
        message: "Emotion analytics created successfully",
        data: mapAnalytics(doc),
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Update emotion analytics by id
 * @route   PATCH /api/v1/emotions/:id
 * @access  Private (Admin)
 *
 * Legacy aggregate mode: updates are not persisted by id.
 */
export const updateEmotionAnalytics = async (req, res, next) => {
  try {
    const { id } = req.params;

    return res.status(200).json(
      successResponse({
        message: "Emotion analytics updated successfully",
        data: {
          _id: id,
          ...req.body,
          notes:
            req.body?.notes ||
            "Legacy aggregate mode: update accepted but not persisted.",
        },
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Delete emotion analytics by id
 * @route   DELETE /api/v1/emotions/:id
 * @access  Private (Admin)
 *
 * Legacy aggregate mode: delete is a no-op for compatibility.
 */
export const deleteEmotionAnalytics = async (req, res, next) => {
  try {
    const { id } = req.params;

    return res.status(200).json(
      successResponse({
        message: "Emotion analytics deleted successfully",
        data: {
          deletedId: id,
        },
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Dashboard summary for emotion analytics
 * @route   GET /api/v1/emotions/summary/dashboard
 * @access  Private (Admin)
 */
export const getEmotionDashboardSummary = async (req, res, next) => {
  try {
    const rows = await fetchLegacyRows(req.query);
    const docs = buildDailyAggregate(rows);

    if (!docs.length) {
      return res.status(200).json(
        successResponse({
          message: "No emotion analytics data found for selected range",
          data: {
            totalRecords: 0,
            averageEmotionPercentages: { ...DEFAULT_EMOTION },
            averageFocusScore: 0,
            mostDifficultTopic: "N/A",
            mostSkippedLesson: "N/A",
            highestEngagementModule: "N/A",
            latest: null,
            trend: [],
          },
        }),
      );
    }

    const totals = docs.reduce(
      (acc, doc) => {
        acc.happy += toNumber(doc.emotionPercentages.happy, 0);
        acc.confused += toNumber(doc.emotionPercentages.confused, 0);
        acc.frustrated += toNumber(doc.emotionPercentages.frustrated, 0);
        acc.angry += toNumber(doc.emotionPercentages.angry, 0);
        acc.neutral += toNumber(doc.emotionPercentages.neutral, 0);
        acc.focus += toNumber(doc.focusMetrics.averageFocusScore, 0);
        return acc;
      },
      { happy: 0, confused: 0, frustrated: 0, angry: 0, neutral: 0, focus: 0 },
    );

    const count = docs.length;
    const latest = docs[docs.length - 1];

    return res.status(200).json(
      successResponse({
        message: "Emotion dashboard summary fetched successfully",
        data: {
          totalRecords: count,
          averageEmotionPercentages: {
            happy: round2(totals.happy / count),
            confused: round2(totals.confused / count),
            frustrated: round2(totals.frustrated / count),
            angry: round2(totals.angry / count),
            neutral: round2(totals.neutral / count),
          },
          averageFocusScore: round2(totals.focus / count),
          mostDifficultTopic: latest.focusMetrics.mostDifficultTopic || "N/A",
          mostSkippedLesson: latest.focusMetrics.mostSkippedLesson || "N/A",
          highestEngagementModule:
            latest.focusMetrics.highestEngagementModule || "N/A",
          latest: mapAnalytics(latest),
          trend: docs.map((d) => ({
            date: d.date,
            ...d.emotionPercentages,
            averageFocusScore: d.focusMetrics.averageFocusScore || 0,
          })),
        },
      }),
    );
  } catch (error) {
    return next(error);
  }
};

export default {
  getEmotionAnalytics,
  getLatestEmotionAnalytics,
  createEmotionAnalytics,
  updateEmotionAnalytics,
  deleteEmotionAnalytics,
  getEmotionDashboardSummary,
};
