import AIInsight from "../models/AIInsight.js";
import Course from "../models/Course.js";
import Module from "../models/Module.js";
import Lesson from "../models/Lesson.js";
import AppError from "../utils/AppError.js";
import { successResponse, paginatedResponse } from "../utils/apiResponse.js";
import { getPagination, parseSort } from "../utils/helpers.js";

/**
 * Build MongoDB filter for insights listing
 */
const buildInsightFilter = (query = {}) => {
  const filter = {};

  if (query.search) {
    const keyword = String(query.search).trim();
    filter.$or = [
      { title: { $regex: keyword, $options: "i" } },
      { message: { $regex: keyword, $options: "i" } },
      { tags: { $regex: keyword, $options: "i" } },
    ];
  }

  if (query.category) filter.category = query.category;
  if (query.severity) filter.severity = query.severity;
  if (query.generatedBy) filter.generatedBy = query.generatedBy;

  if (typeof query.isActioned !== "undefined") {
    filter.isActioned =
      query.isActioned === true ||
      String(query.isActioned).toLowerCase() === "true";
  }

  return filter;
};

/**
 * Keep sorting safe and predictable
 */
const getSafeInsightSort = (sortInput) => {
  const requested = parseSort(sortInput, { generatedAt: -1 });
  const allowed = new Set([
    "generatedAt",
    "createdAt",
    "updatedAt",
    "confidenceScore",
    "severity",
    "category",
    "isActioned",
    "_id",
  ]);

  const safe = {};
  for (const [key, dir] of Object.entries(requested)) {
    if (allowed.has(key)) safe[key] = dir;
  }

  return Object.keys(safe).length ? safe : { generatedAt: -1, _id: -1 };
};

const toLegacyId = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).trim();
};

/**
 * Resolve legacy string references (courseRef/moduleRef/lessonRef) to lightweight objects.
 * This replaces .populate() because legacy refs are string ids (c1/m1/l1), not ObjectIds.
 */
const hydrateInsightRefs = async (insightDoc) => {
  const insight = insightDoc?.toObject
    ? insightDoc.toObject()
    : insightDoc || {};

  const courseId = toLegacyId(insight.courseRef);
  const moduleId = toLegacyId(insight.moduleRef);
  const lessonId = toLegacyId(insight.lessonRef);

  const [course, module, lesson] = await Promise.all([
    courseId
      ? Course.findById(courseId).select("_id title").lean()
      : Promise.resolve(null),
    moduleId
      ? Module.findById(moduleId).select("_id title courseId").lean()
      : Promise.resolve(null),
    lessonId
      ? Lesson.findOne({ lesson_id: lessonId })
          .select("_id lesson_id title moduleId")
          .lean()
      : Promise.resolve(null),
  ]);

  return {
    ...insight,
    courseRef: course
      ? { _id: course._id, title: course.title, courseTitle: course.title }
      : null,
    moduleRef: module
      ? {
          _id: module._id,
          title: module.title,
          moduleTitle: module.title,
          courseId: module.courseId,
        }
      : null,
    lessonRef: lesson
      ? {
          _id: lesson._id,
          lesson_id: lesson.lesson_id,
          title: lesson.title,
          lessonTitle: lesson.title,
          moduleId: lesson.moduleId,
        }
      : null,
  };
};

const hydrateInsights = async (insights = []) =>
  Promise.all(insights.map((i) => hydrateInsightRefs(i)));

/**
 * @desc    Create new AI insight
 * @route   POST /api/v1/insights
 * @access  Private (Admin)
 */
export const createInsight = async (req, res, next) => {
  try {
    const payload = req.body || {};

    const insight = await AIInsight.create({
      ...payload,
      title: payload.title?.trim(),
      message: payload.message?.trim(),
      actionNote: payload.actionNote?.trim() || "",
      courseRef: toLegacyId(payload.courseRef),
      moduleRef: toLegacyId(payload.moduleRef),
      lessonRef: toLegacyId(payload.lessonRef),
      tags: Array.isArray(payload.tags)
        ? payload.tags.map((t) => String(t).trim()).filter(Boolean)
        : [],
    });

    const hydrated = await hydrateInsightRefs(insight);

    return res.status(201).json(
      successResponse({
        message: "AI insight created successfully",
        data: hydrated,
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Get paginated insights with filters
 * @route   GET /api/v1/insights
 * @access  Private (Admin)
 */
export const getInsights = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query, 1, 10, 100);
    const filter = buildInsightFilter(req.query);
    const sort = getSafeInsightSort(req.query.sort);

    const [insights, total] = await Promise.all([
      AIInsight.find(filter).sort(sort).skip(skip).limit(limit),
      AIInsight.countDocuments(filter),
    ]);

    const data = await hydrateInsights(insights);

    return res.status(200).json(
      paginatedResponse({
        message: "AI insights fetched successfully",
        data,
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
 * @desc    Get latest insights (quick panel)
 * @route   GET /api/v1/insights/latest
 * @access  Private (Admin)
 */
export const getLatestInsights = async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 6, 1), 30);

    const insights = await AIInsight.find({})
      .sort({ generatedAt: -1, createdAt: -1, _id: -1 })
      .limit(limit);

    const data = await hydrateInsights(insights);

    return res.status(200).json(
      successResponse({
        message: "Latest AI insights fetched successfully",
        data,
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Get insight by ID
 * @route   GET /api/v1/insights/:id
 * @access  Private (Admin)
 */
export const getInsightById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const insight = await AIInsight.findById(id);

    if (!insight) {
      throw AppError.notFound("AI insight not found", { id });
    }

    const data = await hydrateInsightRefs(insight);

    return res.status(200).json(
      successResponse({
        message: "AI insight fetched successfully",
        data,
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Update insight by ID
 * @route   PATCH /api/v1/insights/:id
 * @access  Private (Admin)
 */
export const updateInsight = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    const insight = await AIInsight.findById(id);
    if (!insight) {
      throw AppError.notFound("AI insight not found", { id });
    }

    if (typeof updates.title !== "undefined")
      updates.title = updates.title.trim();
    if (typeof updates.message !== "undefined")
      updates.message = updates.message.trim();
    if (typeof updates.actionNote !== "undefined") {
      updates.actionNote = updates.actionNote?.trim() || "";
    }
    if (typeof updates.courseRef !== "undefined") {
      updates.courseRef = toLegacyId(updates.courseRef);
    }
    if (typeof updates.moduleRef !== "undefined") {
      updates.moduleRef = toLegacyId(updates.moduleRef);
    }
    if (typeof updates.lessonRef !== "undefined") {
      updates.lessonRef = toLegacyId(updates.lessonRef);
    }
    if (Array.isArray(updates.tags)) {
      updates.tags = updates.tags.map((t) => String(t).trim()).filter(Boolean);
    }

    Object.assign(insight, updates);
    await insight.save();

    const data = await hydrateInsightRefs(insight);

    return res.status(200).json(
      successResponse({
        message: "AI insight updated successfully",
        data,
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Mark insight as actioned (or un-actioned)
 * @route   PATCH /api/v1/insights/:id/action
 * @access  Private (Admin)
 */
export const markInsightActioned = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActioned = true, actionNote = "" } = req.body;

    const insight = await AIInsight.findById(id);
    if (!insight) {
      throw AppError.notFound("AI insight not found", { id });
    }

    insight.isActioned = Boolean(isActioned);
    insight.actionNote = String(actionNote || "").trim();

    await insight.save();

    const data = await hydrateInsightRefs(insight);

    return res.status(200).json(
      successResponse({
        message: insight.isActioned
          ? "Insight marked as actioned"
          : "Insight marked as not actioned",
        data,
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Bulk update insight action state
 * @route   PATCH /api/v1/insights/action/bulk
 * @access  Private (Admin)
 */
export const bulkMarkInsightsActioned = async (req, res, next) => {
  try {
    const { insightIds = [], isActioned = true, actionNote = "" } = req.body;

    if (!Array.isArray(insightIds) || insightIds.length === 0) {
      throw AppError.badRequest("insightIds must be a non-empty array");
    }

    const updatePayload = {
      isActioned: Boolean(isActioned),
      actionNote: String(actionNote || "").trim(),
    };

    const result = await AIInsight.updateMany(
      { _id: { $in: insightIds } },
      { $set: updatePayload },
    );

    return res.status(200).json(
      successResponse({
        message: "Insights updated successfully",
        data: {
          matchedCount: result.matchedCount ?? result.n ?? 0,
          modifiedCount: result.modifiedCount ?? result.nModified ?? 0,
          isActioned: updatePayload.isActioned,
        },
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Delete insight
 * @route   DELETE /api/v1/insights/:id
 * @access  Private (Admin)
 */
export const deleteInsight = async (req, res, next) => {
  try {
    const { id } = req.params;

    const insight = await AIInsight.findById(id);
    if (!insight) {
      throw AppError.notFound("AI insight not found", { id });
    }

    await AIInsight.deleteOne({ _id: id });

    return res.status(200).json(
      successResponse({
        message: "AI insight deleted successfully",
        data: {
          deletedInsightId: id,
        },
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Insight dashboard summary (cards + category/severity distribution)
 * @route   GET /api/v1/insights/summary
 * @access  Private (Admin)
 */
export const getInsightSummary = async (req, res, next) => {
  try {
    const [
      totals,
      categoryDistribution,
      severityDistribution,
      topOpenCritical,
    ] = await Promise.all([
      AIInsight.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            actioned: {
              $sum: { $cond: [{ $eq: ["$isActioned", true] }, 1, 0] },
            },
            pending: {
              $sum: { $cond: [{ $eq: ["$isActioned", false] }, 1, 0] },
            },
            avgConfidence: { $avg: "$confidenceScore" },
          },
        },
      ]),
      AIInsight.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AIInsight.aggregate([
        { $group: { _id: "$severity", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AIInsight.find({
        isActioned: false,
        severity: { $in: ["critical", "high"] },
      })
        .sort({ severity: -1, confidenceScore: -1, generatedAt: -1 })
        .limit(10)
        .select("title category severity confidenceScore generatedAt"),
    ]);

    const totalRow = totals[0] || {
      total: 0,
      actioned: 0,
      pending: 0,
      avgConfidence: 0,
    };

    return res.status(200).json(
      successResponse({
        message: "AI insight summary fetched successfully",
        data: {
          cards: {
            totalInsights: totalRow.total,
            actionedInsights: totalRow.actioned,
            pendingInsights: totalRow.pending,
            averageConfidenceScore: Number(
              (totalRow.avgConfidence || 0).toFixed(2),
            ),
          },
          categoryDistribution: categoryDistribution.map((row) => ({
            category: row._id,
            count: row.count,
          })),
          severityDistribution: severityDistribution.map((row) => ({
            severity: row._id,
            count: row.count,
          })),
          topOpenCritical,
        },
      }),
    );
  } catch (error) {
    return next(error);
  }
};

export default {
  createInsight,
  getInsights,
  getLatestInsights,
  getInsightById,
  updateInsight,
  markInsightActioned,
  bulkMarkInsightsActioned,
  deleteInsight,
  getInsightSummary,
};
