import Course from "../models/Course.js";
import Module from "../models/Module.js";
import Lesson from "../models/Lesson.js";
import AppError from "../utils/AppError.js";
import { successResponse, paginatedResponse } from "../utils/apiResponse.js";
import { getPagination, parseSort } from "../utils/helpers.js";

const moduleView = (moduleDoc) => {
  const module = moduleDoc?.toObject ? moduleDoc.toObject() : moduleDoc || {};
  const course = module.courseId || module.course || null;
  const courseObj =
    course && typeof course === "object"
      ? {
          _id: course._id,
          title: course.title || "",
          courseTitle: course.title || "",
        }
      : null;

  return {
    _id: module._id,
    title: module.title || "",
    moduleTitle: module.title || "",
    courseId: courseObj || module.courseId || "",
    course_id: module.courseId || "",
    courseRef: module.courseRef || module.courseId || "",
    createdAt: module.createdAt || module.createdAtFallback || null,
    updatedAt:
      module.updatedAt || module.createdAt || module.createdAtFallback || null,
  };
};

/**
 * Normalize incoming module payload for legacy collection format.
 * Existing collection shape:
 * { _id: "m1", courseId: "c1", title: "Arrays" }
 */
const normalizeModuleInput = (body = {}) => {
  const title = String(body.title || body.moduleTitle || "").trim();

  const incomingIdRaw = body._id ?? body.moduleId ?? body.id ?? null;
  const incomingId =
    incomingIdRaw === null || incomingIdRaw === undefined
      ? null
      : String(incomingIdRaw).trim();

  const courseIdRaw = body.courseId ?? body.course_id ?? null;
  const courseId =
    courseIdRaw === null || courseIdRaw === undefined
      ? ""
      : String(courseIdRaw).trim();

  return { title, incomingId, courseId };
};

const buildNextModuleId = async () => {
  const rows = await Module.find({}).select("_id").lean();

  let max = 0;
  for (const row of rows) {
    const value = String(row?._id || "");
    const match = value.match(/^m(\d+)$/i);
    if (!match) continue;
    const n = Number(match[1]);
    if (Number.isFinite(n) && n > max) max = n;
  }

  return `m${max + 1}`;
};

/**
 * @desc    Create a new module
 * @route   POST /api/v1/modules
 * @access  Private (Admin)
 */
export const createModule = async (req, res, next) => {
  try {
    const { title, incomingId, courseId } = normalizeModuleInput(req.body);

    if (!courseId) {
      throw AppError.validation("Course id is required", [
        {
          path: "courseId",
          message: "Course id is required",
          code: "required",
        },
      ]);
    }

    if (!title) {
      throw AppError.validation("Module title is required", [
        {
          path: "title",
          message: "Module title is required",
          code: "required",
        },
      ]);
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return next(AppError.notFound("Course not found", { courseId }));
    }

    const existing = await Module.findOne({
      courseId,
      title,
    });

    if (existing) {
      return next(
        AppError.conflict(
          "A module with this title already exists in this course",
          {
            courseId,
            title,
          },
        ),
      );
    }

    let finalId = incomingId;
    if (!finalId) {
      finalId = await buildNextModuleId();
    } else {
      const existingById = await Module.findById(finalId);
      if (existingById) {
        return next(
          AppError.conflict("A module with this id already exists", {
            field: "_id",
          }),
        );
      }
    }

    const moduleDoc = await Module.create({
      _id: finalId,
      courseId,
      title,
      courseRef: courseId,
      lessonRefs: [],
      createdAtFallback: new Date(),
    });

    return res.status(201).json(
      successResponse({
        message: "Module created successfully",
        data: moduleView(moduleDoc),
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Get all modules (optional filters + pagination)
 * @route   GET /api/v1/modules
 * @access  Private (Admin)
 */
export const getModules = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query, 1, 10, 100);
    const sort = parseSort(req.query.sort, { _id: 1 });

    const filter = {};

    if (req.query.courseId) {
      filter.courseId = String(req.query.courseId).trim();
    }

    if (req.query.search) {
      filter.title = { $regex: String(req.query.search).trim(), $options: "i" };
    }

    const [modules, total] = await Promise.all([
      Module.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("courseId", "_id title"),
      Module.countDocuments(filter),
    ]);

    return res.status(200).json(
      paginatedResponse({
        message: "Modules fetched successfully",
        data: modules.map(moduleView),
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
 * @desc    Get modules under a specific course
 * @route   GET /api/v1/modules/course/:courseId
 * @access  Private (Admin)
 */
export const getModulesByCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { page, limit, skip } = getPagination(req.query, 1, 10, 100);
    const sort = parseSort(req.query.sort, { _id: 1 });

    const course = await Course.findById(courseId).select("_id title");
    if (!course) {
      return next(AppError.notFound("Course not found", { courseId }));
    }

    const filter = { courseId: String(courseId).trim() };

    if (req.query.search) {
      filter.title = {
        $regex: String(req.query.search).trim(),
        $options: "i",
      };
    }

    const [modules, total] = await Promise.all([
      Module.find(filter).sort(sort).skip(skip).limit(limit),
      Module.countDocuments(filter),
    ]);

    return res.status(200).json(
      paginatedResponse({
        message: "Course modules fetched successfully",
        data: {
          course: {
            _id: course._id,
            title: course.title || "",
            courseTitle: course.title || "",
          },
          modules: modules.map(moduleView),
        },
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
 * @desc    Get module by ID
 * @route   GET /api/v1/modules/:moduleId
 * @access  Private (Admin)
 */
export const getModuleById = async (req, res, next) => {
  try {
    const { moduleId } = req.params;

    const moduleDoc = await Module.findById(moduleId).populate(
      "courseId",
      "_id title",
    );

    if (!moduleDoc) {
      return next(AppError.notFound("Module not found", { moduleId }));
    }

    const lessonCount = await Lesson.countDocuments({
      moduleId: moduleDoc._id,
    });

    return res.status(200).json(
      successResponse({
        message: "Module fetched successfully",
        data: {
          ...moduleView(moduleDoc),
          stats: {
            lessonCount,
          },
        },
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Update module by ID
 * @route   PATCH /api/v1/modules/:moduleId
 * @access  Private (Admin)
 */
export const updateModule = async (req, res, next) => {
  try {
    const { moduleId } = req.params;

    const moduleDoc = await Module.findById(moduleId);
    if (!moduleDoc) {
      return next(AppError.notFound("Module not found", { moduleId }));
    }

    const { title, courseId } = normalizeModuleInput(req.body);

    const nextCourseId = courseId || moduleDoc.courseId;

    if (courseId) {
      const course = await Course.findById(courseId).select("_id");
      if (!course) {
        return next(AppError.notFound("Target course not found", { courseId }));
      }
    }

    if (!title) {
      throw AppError.validation("Module title is required", [
        {
          path: "title",
          message: "Module title is required",
          code: "required",
        },
      ]);
    }

    const duplicate = await Module.findOne({
      _id: { $ne: moduleId },
      courseId: nextCourseId,
      title,
    });

    if (duplicate) {
      return next(
        AppError.conflict(
          "Another module with this title already exists in this course",
          {
            title,
            courseId: nextCourseId,
          },
        ),
      );
    }

    moduleDoc.title = title;
    moduleDoc.courseId = nextCourseId;
    moduleDoc.courseRef = nextCourseId;
    moduleDoc.createdAtFallback = moduleDoc.createdAtFallback || new Date();

    await moduleDoc.save();

    return res.status(200).json(
      successResponse({
        message: "Module updated successfully",
        data: moduleView(moduleDoc),
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Delete module by ID (cascade lessons)
 * @route   DELETE /api/v1/modules/:moduleId
 * @access  Private (Admin)
 */
export const deleteModule = async (req, res, next) => {
  try {
    const { moduleId } = req.params;

    const moduleDoc = await Module.findById(moduleId);
    if (!moduleDoc) {
      return next(AppError.notFound("Module not found", { moduleId }));
    }

    const deletedLessons = await Lesson.deleteMany({ moduleId: moduleDoc._id });
    await Module.deleteOne({ _id: moduleDoc._id });

    return res.status(200).json(
      successResponse({
        message: "Module deleted successfully",
        data: {
          deletedModuleId: moduleDoc._id,
          deletedLessons: deletedLessons.deletedCount || 0,
        },
      }),
    );
  } catch (error) {
    return next(error);
  }
};

export default {
  createModule,
  getModules,
  getModulesByCourse,
  getModuleById,
  updateModule,
  deleteModule,
};
