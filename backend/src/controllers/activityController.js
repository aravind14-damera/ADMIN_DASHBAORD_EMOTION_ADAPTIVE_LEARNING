import StudentActivity from "../models/StudentActivity.js";
import LearningSession from "../models/LearningSession.js";
import UserStat from "../models/UserStat.js";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import { successResponse, paginatedResponse } from "../utils/apiResponse.js";
import {
  getPagination,
  parseSort,
  buildPaginationMeta,
} from "../utils/helpers.js";

/**
 * Build query filters for activity listing.
 * Hybrid behavior:
 * - Primary source: StudentActivity
 * - Fallback source: legacy UserStat + LearningSession
 */
const buildActivityFilter = (query = {}) => {
  const filter = {};

  if (query.userId) {
    filter.userId = query.userId;
  }

  if (query.minProgress !== undefined) {
    filter.progressPercent = {
      ...(filter.progressPercent || {}),
      $gte: Number(query.minProgress),
    };
  }

  if (query.maxProgress !== undefined) {
    filter.progressPercent = {
      ...(filter.progressPercent || {}),
      $lte: Number(query.maxProgress),
    };
  }

  if (query.from || query.to) {
    filter.updatedAt = {};
    if (query.from) filter.updatedAt.$gte = new Date(query.from);
    if (query.to) filter.updatedAt.$lte = new Date(query.to);
  }

  return filter;
};

const buildSessionFilter = (query = {}) => {
  const filter = {};

  if (query.userId) {
    filter.user_id = String(query.userId).trim();
  }

  if (query.from || query.to) {
    filter.start_time = {};
    if (query.from) filter.start_time.$gte = new Date(query.from);
    if (query.to) filter.start_time.$lte = new Date(query.to);
  }

  if (query.status) {
    filter.status = String(query.status).trim().toLowerCase();
  }

  return filter;
};

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const round2 = (value) => Number(toNumber(value, 0).toFixed(2));

const toActivityView = (activityDoc, userDoc = null) => {
  const activity = activityDoc?.toObject
    ? activityDoc.toObject()
    : activityDoc || {};
  const user = userDoc?.toObject ? userDoc.toObject() : userDoc || null;

  return {
    _id: activity._id,
    userId: activity.userId,
    user: user
      ? {
          _id: user._id,
          name: user.name,
          email: user.email,
          status: user.status || "active",
          joinedDate: user.createdAt || null,
        }
      : null,
    totalLearningTimeMinutes: activity.totalLearningTimeMinutes || 0,
    totalLearningTimeHours: round2(
      (activity.totalLearningTimeMinutes || 0) / 60,
    ),
    lessonsWatched: activity.lessonsWatched || 0,
    completedTopics: activity.completedTopics || 0,
    currentStreakDays: activity.currentStreakDays || 0,
    lastLoginAt: activity.lastLoginAt || null,
    progressPercent: activity.progressPercent || 0,
    activityByDate: activity.activityByDate || [],
    topicProgress: activity.topicProgress || [],
    metadata: activity.metadata || {},
    createdAt: activity.createdAt || null,
    updatedAt: activity.updatedAt || null,
  };
};

/**
 * Build fallback activity row from legacy collections (UserStat + LearningSession).
 */
const toLegacyActivityView = ({ user, stat = null, sessions = [] }) => {
  const u = user?.toObject ? user.toObject() : user || {};
  const s = stat?.toObject ? stat.toObject() : stat || {};

  const totalLearningTimeMinutes = sessions.reduce(
    (sum, row) => sum + toNumber(row.duration_minutes, 0),
    0,
  );

  const lessonsWatched = sessions.length;
  const completedTopics = toNumber(s.completed_topics, 0);
  const currentStreakDays = toNumber(s.current_streak, 0);

  const totalCourseTouches = Math.max(lessonsWatched, 1);
  const progressPercent = Math.min(
    100,
    round2((completedTopics / totalCourseTouches) * 100),
  );

  return {
    _id: String(u._id || s._id || ""),
    userId: String(u._id || s.user_id || s.userId || ""),
    user: u._id
      ? {
          _id: u._id,
          name: u.name || "Unknown",
          email: u.email || "",
          status: u.status || "active",
          joinedDate: u.createdAt || null,
        }
      : null,
    totalLearningTimeMinutes,
    totalLearningTimeHours: round2(totalLearningTimeMinutes / 60),
    lessonsWatched,
    completedTopics,
    currentStreakDays,
    lastLoginAt: null,
    progressPercent,
    activityByDate: sessions.map((row) => ({
      date: row.start_time || null,
      learningTimeMinutes: toNumber(row.duration_minutes, 0),
      lessonsWatched: 1,
    })),
    topicProgress: [],
    metadata: {
      source: "legacy-userstats-learning-sessions",
      last_active: s.last_active || null,
      last_active_date: s.last_active_date || null,
    },
    createdAt: u.createdAt || null,
    updatedAt: u.updatedAt || null,
  };
};

/**
 * @desc    Get activity table for admin (searchable, paginated)
 * @route   GET /api/v1/activity
 * @access  Private (Admin)
 */
export const getActivities = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query, 1, 10, 100);
    const sort = parseSort(req.query.sort, { updatedAt: -1 });

    // Search users once for both primary and fallback flows
    let userIdsFromSearch = null;
    if (req.query.search) {
      const keyword = String(req.query.search).trim();
      const users = await User.find({
        $or: [
          { name: { $regex: keyword, $options: "i" } },
          { email: { $regex: keyword, $options: "i" } },
        ],
      }).select("_id");
      userIdsFromSearch = users.map((u) => u._id);
    }

    // 1) Primary source: StudentActivity
    const primaryFilter = buildActivityFilter(req.query);
    if (userIdsFromSearch) {
      primaryFilter.userId = { $in: userIdsFromSearch };
    }

    const [primaryRows, primaryTotal] = await Promise.all([
      StudentActivity.find(primaryFilter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("userId", "name email status createdAt lastActiveAt"),
      StudentActivity.countDocuments(primaryFilter),
    ]);

    if (primaryRows.length > 0 || primaryTotal > 0) {
      const data = primaryRows.map((row) => toActivityView(row, row.userId));
      const meta = buildPaginationMeta({ total: primaryTotal, page, limit });

      return res.status(200).json(
        paginatedResponse({
          message: "Student activities fetched successfully",
          data,
          page: meta.page,
          limit: meta.limit,
          total: meta.total,
        }),
      );
    }

    // 2) Fallback source: legacy UserStat + LearningSession
    const userFilter = {};
    if (req.query.search) {
      const keyword = String(req.query.search).trim();
      userFilter.$or = [
        { name: { $regex: keyword, $options: "i" } },
        { email: { $regex: keyword, $options: "i" } },
      ];
    }

    const allowedSort = new Set([
      "_id",
      "name",
      "email",
      "createdAt",
      "updatedAt",
    ]);
    const safeSort = Object.entries(sort).reduce((acc, [k, v]) => {
      if (allowedSort.has(k)) acc[k] = v;
      return acc;
    }, {});
    const finalSort = Object.keys(safeSort).length ? safeSort : { _id: -1 };

    const [users, totalUsers] = await Promise.all([
      User.find(userFilter).sort(finalSort).skip(skip).limit(limit).lean(),
      User.countDocuments(userFilter),
    ]);

    const userIds = users.map((u) => String(u._id));

    const [stats, sessions] = await Promise.all([
      userIds.length
        ? UserStat.find({
            $or: [{ user_id: { $in: userIds } }, { userId: { $in: userIds } }],
          }).lean()
        : [],
      userIds.length
        ? LearningSession.find({
            ...buildSessionFilter(req.query),
            user_id: { $in: userIds },
          })
            .sort({ start_time: -1 })
            .lean()
        : [],
    ]);

    const statMap = new Map();
    for (const st of stats) {
      if (st.user_id) statMap.set(String(st.user_id), st);
      if (st.userId) statMap.set(String(st.userId), st);
    }

    const sessionMap = new Map();
    for (const sess of sessions) {
      const key = String(sess.user_id || "");
      if (!sessionMap.has(key)) sessionMap.set(key, []);
      sessionMap.get(key).push(sess);
    }

    const data = users.map((user) =>
      toLegacyActivityView({
        user,
        stat: statMap.get(String(user._id)) || null,
        sessions: sessionMap.get(String(user._id)) || [],
      }),
    );

    const meta = buildPaginationMeta({ total: totalUsers, page, limit });

    return res.status(200).json(
      paginatedResponse({
        message: "Student activities fetched successfully",
        data,
        page: meta.page,
        limit: meta.limit,
        total: meta.total,
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Get single student activity by id
 * @route   GET /api/v1/activity/:id
 * @access  Private (Admin)
 */
export const getActivityById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Primary: StudentActivity by activity document id
    const activity = await StudentActivity.findById(id).populate(
      "userId",
      "name email status createdAt lastActiveAt",
    );

    if (activity) {
      return res.status(200).json(
        successResponse({
          message: "Student activity fetched successfully",
          data: toActivityView(activity, activity.userId),
        }),
      );
    }

    // Fallback: treat id as user id in legacy flow
    const user = await User.findById(id).lean();
    if (!user) {
      throw AppError.notFound("Student activity not found", { id });
    }

    const [stat, sessions] = await Promise.all([
      UserStat.findOne({
        $or: [{ user_id: String(user._id) }, { userId: String(user._id) }],
      }).lean(),
      LearningSession.find({ user_id: String(user._id) })
        .sort({ start_time: -1 })
        .lean(),
    ]);

    return res.status(200).json(
      successResponse({
        message: "Student activity fetched successfully",
        data: toLegacyActivityView({ user, stat, sessions }),
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Create student activity row
 * @route   POST /api/v1/activity
 * @access  Private (Admin)
 */
export const createActivity = async (req, res, next) => {
  try {
    const payload = req.body || {};

    const user = await User.findById(payload.userId);
    if (!user) {
      throw AppError.notFound("User not found for activity creation", {
        userId: payload.userId,
      });
    }

    // Prefer modern StudentActivity if not already present
    const existing = await StudentActivity.findOne({ userId: payload.userId });
    if (existing) {
      throw AppError.conflict("Activity already exists for this user", {
        userId: payload.userId,
      });
    }

    const created = await StudentActivity.create({
      userId: payload.userId,
      totalLearningTimeMinutes: payload.totalLearningTimeMinutes || 0,
      lessonsWatched: payload.lessonsWatched || 0,
      completedTopics: payload.completedTopics || 0,
      currentStreakDays: payload.currentStreakDays || 0,
      lastLoginAt: payload.lastLoginAt || null,
      progressPercent: payload.progressPercent || 0,
      activityByDate: payload.activityByDate || [],
      topicProgress: payload.topicProgress || [],
      metadata: payload.metadata || {},
    });

    return res.status(201).json(
      successResponse({
        message: "Student activity created successfully",
        data: toActivityView(created, user),
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Update student activity by id
 * @route   PATCH /api/v1/activity/:id
 * @access  Private (Admin)
 */
export const updateActivity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    // Primary: StudentActivity update by doc id
    const activity = await StudentActivity.findById(id);

    if (activity) {
      if (
        updates.userId &&
        String(updates.userId) !== String(activity.userId)
      ) {
        const user = await User.findById(updates.userId);
        if (!user) {
          throw AppError.notFound("Target user not found", {
            userId: updates.userId,
          });
        }

        const duplicate = await StudentActivity.findOne({
          _id: { $ne: id },
          userId: updates.userId,
        });
        if (duplicate) {
          throw AppError.conflict(
            "Another activity already exists for target user",
            {
              userId: updates.userId,
            },
          );
        }
      }

      Object.assign(activity, updates);
      await activity.save();

      const user = await User.findById(activity.userId).select(
        "name email status createdAt lastActiveAt",
      );

      return res.status(200).json(
        successResponse({
          message: "Student activity updated successfully",
          data: toActivityView(activity, user),
        }),
      );
    }

    // Fallback: legacy update treating :id as user id
    const user = await User.findById(id).lean();
    if (!user) {
      throw AppError.notFound("Student activity not found", { id });
    }

    const statPatch = {};
    if (updates.completedTopics !== undefined) {
      statPatch.completed_topics = toNumber(updates.completedTopics, 0);
    }
    if (updates.currentStreakDays !== undefined) {
      statPatch.current_streak = toNumber(updates.currentStreakDays, 0);
    }
    if (updates.lastActiveAt !== undefined) {
      const d = updates.lastActiveAt ? new Date(updates.lastActiveAt) : null;
      statPatch.last_active = d;
      statPatch.last_active_date = d;
    }

    await UserStat.findOneAndUpdate(
      { $or: [{ user_id: String(user._id) }, { userId: String(user._id) }] },
      {
        $setOnInsert: {
          user_id: String(user._id),
          userId: String(user._id),
        },
        ...(Object.keys(statPatch).length > 0 ? { $set: statPatch } : {}),
      },
      { upsert: true, new: true },
    );

    const [stat, sessions] = await Promise.all([
      UserStat.findOne({
        $or: [{ user_id: String(user._id) }, { userId: String(user._id) }],
      }).lean(),
      LearningSession.find({ user_id: String(user._id) })
        .sort({ start_time: -1 })
        .lean(),
    ]);

    return res.status(200).json(
      successResponse({
        message: "Student activity updated successfully",
        data: toLegacyActivityView({ user, stat, sessions }),
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Delete student activity by id
 * @route   DELETE /api/v1/activity/:id
 * @access  Private (Admin)
 */
export const deleteActivity = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Primary: delete StudentActivity doc by id
    const activity = await StudentActivity.findById(id);
    if (activity) {
      await StudentActivity.deleteOne({ _id: id });

      return res.status(200).json(
        successResponse({
          message: "Student activity deleted successfully",
          data: { deletedId: id },
        }),
      );
    }

    // Fallback: treat id as user id, remove legacy stats
    const user = await User.findById(id).lean();
    if (!user) {
      throw AppError.notFound("Student activity not found", { id });
    }

    await UserStat.deleteMany({
      $or: [{ user_id: String(user._id) }, { userId: String(user._id) }],
    });

    return res.status(200).json(
      successResponse({
        message: "Student activity deleted successfully",
        data: { deletedId: id },
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Upsert activity by user id (useful for sync jobs)
 * @route   PUT /api/v1/activity/user/:userId
 * @access  Private (Admin)
 */
export const upsertActivityByUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const payload = req.body || {};

    const user = await User.findById(userId);
    if (!user) {
      throw AppError.notFound("User not found", { userId });
    }

    // Prefer StudentActivity upsert as primary source of truth
    const updateDoc = {
      ...(payload.totalLearningTimeMinutes !== undefined && {
        totalLearningTimeMinutes: payload.totalLearningTimeMinutes,
      }),
      ...(payload.lessonsWatched !== undefined && {
        lessonsWatched: payload.lessonsWatched,
      }),
      ...(payload.completedTopics !== undefined && {
        completedTopics: payload.completedTopics,
      }),
      ...(payload.currentStreakDays !== undefined && {
        currentStreakDays: payload.currentStreakDays,
      }),
      ...(payload.lastLoginAt !== undefined && {
        lastLoginAt: payload.lastLoginAt,
      }),
      ...(payload.progressPercent !== undefined && {
        progressPercent: payload.progressPercent,
      }),
      ...(payload.activityByDate !== undefined && {
        activityByDate: payload.activityByDate,
      }),
      ...(payload.topicProgress !== undefined && {
        topicProgress: payload.topicProgress,
      }),
      ...(payload.metadata !== undefined && {
        metadata: payload.metadata,
      }),
    };

    const activity = await StudentActivity.findOneAndUpdate(
      { userId },
      { $set: updateDoc, $setOnInsert: { userId } },
      { upsert: true, new: true, runValidators: true },
    );

    // Keep legacy stat minimally synced for fallback consistency
    const legacyPatch = {};
    if (payload.completedTopics !== undefined) {
      legacyPatch.completed_topics = toNumber(payload.completedTopics, 0);
    }
    if (payload.currentStreakDays !== undefined) {
      legacyPatch.current_streak = toNumber(payload.currentStreakDays, 0);
    }
    if (payload.lastActiveAt !== undefined) {
      const d = payload.lastActiveAt ? new Date(payload.lastActiveAt) : null;
      legacyPatch.last_active = d;
      legacyPatch.last_active_date = d;
    }

    if (Object.keys(legacyPatch).length > 0) {
      await UserStat.findOneAndUpdate(
        { $or: [{ user_id: String(userId) }, { userId: String(userId) }] },
        {
          $setOnInsert: {
            user_id: String(userId),
            userId: String(userId),
          },
          $set: legacyPatch,
        },
        { upsert: true, new: true },
      );
    }

    return res.status(200).json(
      successResponse({
        message: "Student activity upserted successfully",
        data: toActivityView(activity, user),
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Get summary metrics for activity dashboard cards
 * @route   GET /api/v1/activity/summary
 * @access  Private (Admin)
 */
export const getActivitySummary = async (req, res, next) => {
  try {
    // Prefer StudentActivity aggregates
    const stats = await StudentActivity.aggregate([
      {
        $group: {
          _id: null,
          totalStudentsTracked: { $sum: 1 },
          totalLearningTimeMinutes: { $sum: "$totalLearningTimeMinutes" },
          totalLessonsWatched: { $sum: "$lessonsWatched" },
          avgProgressPercent: { $avg: "$progressPercent" },
          avgCurrentStreakDays: { $avg: "$currentStreakDays" },
        },
      },
    ]);

    const primary = stats[0];
    if (primary) {
      return res.status(200).json(
        successResponse({
          message: "Activity summary fetched successfully",
          data: {
            totalStudentsTracked: primary.totalStudentsTracked || 0,
            totalLearningTimeMinutes: primary.totalLearningTimeMinutes || 0,
            totalLearningTimeHours: round2(
              (primary.totalLearningTimeMinutes || 0) / 60,
            ),
            totalLessonsWatched: primary.totalLessonsWatched || 0,
            avgProgressPercent: round2(primary.avgProgressPercent || 0),
            avgCurrentStreakDays: round2(primary.avgCurrentStreakDays || 0),
          },
        }),
      );
    }

    // Fallback summary from legacy sources
    const [legacyStats, legacySessions] = await Promise.all([
      UserStat.find({}).lean(),
      LearningSession.find({}).lean(),
    ]);

    const totalStudentsTracked = legacyStats.length;
    const totalLearningTimeMinutes = legacySessions.reduce(
      (sum, row) => sum + toNumber(row.duration_minutes, 0),
      0,
    );
    const totalLessonsWatched = legacySessions.length;

    const avgCurrentStreakDays =
      totalStudentsTracked > 0
        ? round2(
            legacyStats.reduce(
              (sum, row) => sum + toNumber(row.current_streak, 0),
              0,
            ) / totalStudentsTracked,
          )
        : 0;

    const avgProgressPercent =
      totalStudentsTracked > 0
        ? round2(
            legacyStats.reduce(
              (sum, row) => sum + toNumber(row.completed_topics, 0),
              0,
            ) / totalStudentsTracked,
          )
        : 0;

    return res.status(200).json(
      successResponse({
        message: "Activity summary fetched successfully",
        data: {
          totalStudentsTracked,
          totalLearningTimeMinutes,
          totalLearningTimeHours: round2(totalLearningTimeMinutes / 60),
          totalLessonsWatched,
          avgProgressPercent,
          avgCurrentStreakDays,
        },
      }),
    );
  } catch (error) {
    return next(error);
  }
};

export default {
  getActivities,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
  upsertActivityByUser,
  getActivitySummary,
};
