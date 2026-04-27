import User from "../models/User.js";
import UserStat from "../models/UserStat.js";
import AppError from "../utils/AppError.js";
import { successResponse, paginatedResponse } from "../utils/apiResponse.js";
import {
  getPagination,
  parseSort,
  buildPaginationMeta,
} from "../utils/helpers.js";

/**
 * Build searchable filter for users collection.
 */
const buildUserFilter = (query = {}) => {
  const filter = {};

  if (query.search) {
    const keyword = String(query.search).trim();
    if (keyword) {
      filter.$or = [
        { name: { $regex: keyword, $options: "i" } },
        { email: { $regex: keyword, $options: "i" } },
      ];
    }
  }

  return filter;
};

const normalizeEmail = (email) =>
  String(email || "")
    .trim()
    .toLowerCase();

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const clampPercent = (value) => {
  const n = toNumber(value, 0);
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Number(n.toFixed(2));
};

const deriveStatus = (user = {}) => {
  if (String(user.role || "").toLowerCase() === "admin") return "inactive";
  return "active";
};

/**
 * Convert a users + userstats pair into UI-friendly shape expected by frontend.
 */
const mapUserWithStats = (userDoc, statDoc = null) => {
  const user = userDoc?.toObject ? userDoc.toObject() : userDoc || {};
  const stat = statDoc?.toObject ? statDoc.toObject() : statDoc || {};

  const currentStreak =
    typeof stat.current_streak === "number" ? stat.current_streak : 0;

  const completedTopics =
    typeof stat.completed_topics === "number" ? stat.completed_topics : 0;

  const lastActive =
    stat.last_active || stat.last_active_date || user.lastActiveAt || null;

  return {
    _id: user._id,
    name: user.name || "",
    email: user.email || "",
    role: user.role || "student",

    // Frontend-friendly fields
    status: deriveStatus(user),
    joinedDate: user.createdAt || null,
    lastActive,
    lastLoginAt: user.lastLoginAt || null,
    learningProgress: clampPercent(user.learningProgress ?? 0),
    totalLearningTimeMinutes: toNumber(user.totalLearningTimeMins, 0),
    lessonsWatched: toNumber(user.lessonsWatched, 0),
    completedTopics,
    currentStreakDays: currentStreak,
  };
};

const applyStatusFilter = (rows, statusValue) => {
  if (!statusValue) return rows;
  return rows.filter((row) => row.status === statusValue);
};

/**
 * @desc    Get all users with search + pagination
 * @route   GET /api/v1/users
 * @access  Private (Admin)
 */
export const getUsers = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query, 1, 10, 100);
    const filter = buildUserFilter(req.query);

    const sort = parseSort(req.query.sort, { _id: -1 });
    const safeSortKeys = new Set([
      "_id",
      "name",
      "email",
      "createdAt",
      "updatedAt",
      "role",
      "learningProgress",
      "lastActiveAt",
    ]);

    const normalizedSort = Object.entries(sort).reduce((acc, [key, dir]) => {
      if (safeSortKeys.has(key)) acc[key] = dir;
      return acc;
    }, {});

    const finalSort = Object.keys(normalizedSort).length
      ? normalizedSort
      : { _id: -1 };

    const baseUsers = await User.find(filter).sort(finalSort).lean();

    const baseUserIds = baseUsers.map((u) => String(u._id));
    const stats = baseUserIds.length
      ? await UserStat.find({
          $or: [
            { user_id: { $in: baseUserIds } },
            { userId: { $in: baseUserIds } },
          ],
        }).lean()
      : [];

    const statMap = new Map();
    for (const stat of stats) {
      const k1 = stat.user_id ? String(stat.user_id) : "";
      const k2 = stat.userId ? String(stat.userId) : "";
      if (k1) statMap.set(k1, stat);
      if (k2) statMap.set(k2, stat);
    }

    const allRows = baseUsers.map((user) =>
      mapUserWithStats(user, statMap.get(String(user._id))),
    );

    const filteredRows = applyStatusFilter(allRows, req.query.status);
    const totalRaw = filteredRows.length;
    const pagedRows = filteredRows.slice(skip, skip + limit);

    const meta = buildPaginationMeta({ total: totalRaw, page, limit });

    return res.status(200).json(
      paginatedResponse({
        message: "Users fetched successfully",
        data: pagedRows,
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
 * @desc    Get single user by id
 * @route   GET /api/v1/users/:userId
 * @access  Private (Admin)
 */
export const getUserById = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const [user, stat] = await Promise.all([
      User.findById(userId).lean(),
      UserStat.findOne({
        $or: [{ user_id: String(userId) }, { userId: String(userId) }],
      }).lean(),
    ]);

    if (!user) {
      throw AppError.notFound("User not found", { userId });
    }

    return res.status(200).json(
      successResponse({
        message: "User fetched successfully",
        data: mapUserWithStats(user, stat),
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Create a user
 * @route   POST /api/v1/users
 * @access  Private (Admin)
 */
export const createUser = async (req, res, next) => {
  try {
    const payload = req.body || {};
    const email = normalizeEmail(payload.email);

    const existing = await User.findOne({ email }).lean();
    if (existing) {
      throw AppError.conflict("A user with this email already exists", {
        field: "email",
      });
    }

    const createdUser = await User.create({
      name: String(payload.name || "").trim(),
      email,
      password: String(payload.password || ""),
      role: payload.role || "student",

      // restore learning progress support
      learningProgress: clampPercent(payload.learningProgress ?? 0),
      totalLearningTimeMins: toNumber(payload.totalLearningTimeMins, 0),
      lessonsWatched: toNumber(payload.lessonsWatched, 0),
      completedTopics: toNumber(payload.completedTopics, 0),
      currentStreakDays: toNumber(payload.currentStreakDays, 0),
      lastActiveAt: payload.lastActiveAt
        ? new Date(payload.lastActiveAt)
        : null,
      lastLoginAt: payload.lastLoginAt ? new Date(payload.lastLoginAt) : null,
      avatarUrl: String(payload.avatarUrl || "").trim(),
      status: payload.status || "active",
      metadata: payload.metadata || undefined,
    });

    await UserStat.findOneAndUpdate(
      {
        $or: [
          { user_id: String(createdUser._id) },
          { userId: String(createdUser._id) },
        ],
      },
      {
        $setOnInsert: {
          user_id: String(createdUser._id),
          userId: String(createdUser._id),
        },
        $set: {
          completed_topics: toNumber(payload.completedTopics, 0),
          current_streak: toNumber(payload.currentStreakDays, 0),
          last_active: payload.lastActiveAt
            ? new Date(payload.lastActiveAt)
            : null,
          last_active_date: payload.lastActiveAt
            ? new Date(payload.lastActiveAt)
            : null,
        },
      },
      { upsert: true, new: true },
    );

    return res.status(201).json(
      successResponse({
        message: "User created successfully",
        data: mapUserWithStats(createdUser),
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Update user by id
 * @route   PATCH /api/v1/users/:userId
 * @access  Private (Admin)
 */
export const updateUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const updates = { ...req.body };

    const user = await User.findById(userId);
    if (!user) {
      throw AppError.notFound("User not found", { userId });
    }

    if (updates.email !== undefined) {
      updates.email = normalizeEmail(updates.email);
      const duplicate = await User.findOne({
        _id: { $ne: userId },
        email: updates.email,
      }).lean();
      if (duplicate) {
        throw AppError.conflict("Another user with this email already exists", {
          field: "email",
        });
      }
    }

    if (updates.name !== undefined)
      user.name = String(updates.name || "").trim();
    if (updates.email !== undefined) user.email = updates.email;
    if (updates.password !== undefined)
      user.password = String(updates.password || "");
    if (updates.role !== undefined)
      user.role = String(updates.role || "student").trim();

    // restore learning progress updates
    if (updates.learningProgress !== undefined) {
      user.learningProgress = clampPercent(updates.learningProgress);
    }
    if (updates.totalLearningTimeMins !== undefined) {
      user.totalLearningTimeMins = toNumber(updates.totalLearningTimeMins, 0);
    }
    if (updates.lessonsWatched !== undefined) {
      user.lessonsWatched = toNumber(updates.lessonsWatched, 0);
    }
    if (updates.completedTopics !== undefined) {
      user.completedTopics = toNumber(updates.completedTopics, 0);
    }
    if (updates.currentStreakDays !== undefined) {
      user.currentStreakDays = toNumber(updates.currentStreakDays, 0);
    }
    if (updates.lastActiveAt !== undefined) {
      user.lastActiveAt = updates.lastActiveAt
        ? new Date(updates.lastActiveAt)
        : null;
    }
    if (updates.lastLoginAt !== undefined) {
      user.lastLoginAt = updates.lastLoginAt
        ? new Date(updates.lastLoginAt)
        : null;
    }
    if (updates.avatarUrl !== undefined) {
      user.avatarUrl = String(updates.avatarUrl || "").trim();
    }
    if (updates.status !== undefined) {
      user.status = String(updates.status || "active")
        .trim()
        .toLowerCase();
    }

    await user.save();

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

    if (Object.keys(statPatch).length > 0) {
      await UserStat.findOneAndUpdate(
        { $or: [{ user_id: String(user._id) }, { userId: String(user._id) }] },
        {
          $set: statPatch,
          $setOnInsert: {
            user_id: String(user._id),
            userId: String(user._id),
          },
        },
        { upsert: true, new: true },
      );
    }

    const stat = await UserStat.findOne({
      $or: [{ user_id: String(user._id) }, { userId: String(user._id) }],
    }).lean();

    return res.status(200).json(
      successResponse({
        message: "User updated successfully",
        data: mapUserWithStats(user, stat),
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Block/unblock user
 * @route   PATCH /api/v1/users/:userId/block
 * @access  Private (Admin)
 */
export const blockUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { blocked } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      throw AppError.notFound("User not found", { userId });
    }

    user.status = blocked ? "blocked" : "active";
    await user.save();

    return res.status(200).json(
      successResponse({
        message: blocked
          ? "User blocked successfully"
          : "User unblocked successfully",
        data: {
          _id: user._id,
          status: user.status,
        },
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Delete user and linked userstats
 * @route   DELETE /api/v1/users/:userId
 * @access  Private (Admin)
 */
export const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      throw AppError.notFound("User not found", { userId });
    }

    await Promise.all([
      UserStat.deleteMany({
        $or: [{ user_id: String(user._id) }, { userId: String(user._id) }],
      }),
      User.deleteOne({ _id: user._id }),
    ]);

    return res.status(200).json(
      successResponse({
        message: "User deleted successfully",
        data: {
          deletedUserId: userId,
        },
      }),
    );
  } catch (error) {
    return next(error);
  }
};

export default {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  blockUser,
  deleteUser,
};
