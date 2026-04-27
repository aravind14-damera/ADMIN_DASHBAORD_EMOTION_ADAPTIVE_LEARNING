import Course from "../models/Course.js";
import Module from "../models/Module.js";
import Lesson from "../models/Lesson.js";
import AppError from "../utils/AppError.js";
import { successResponse, paginatedResponse } from "../utils/apiResponse.js";
import {
  getPagination,
  parseSort,
  buildPaginationMeta,
} from "../utils/helpers.js";

/**
 * Normalize incoming course payload for legacy collection format.
 * Storage shape:
 * { _id: "c1", title: "Data Structures", ...optionalMetadata }
 */
const normalizeCourseInput = (body = {}) => {
  const title = String(body.title || body.courseTitle || "").trim();

  // Optional explicit id from client (legacy style like c1, c2...)
  const incomingIdRaw = body._id ?? body.courseId ?? body.id ?? null;
  const incomingId =
    incomingIdRaw === null || incomingIdRaw === undefined
      ? null
      : String(incomingIdRaw).trim();

  const objectIdLike = String(body.objectId || body.mongoId || "").trim();

  const courseDescription = String(body.courseDescription || "").trim();
  const thumbnail = String(body.thumbnail || "").trim();
  const isPublishedRaw = body.isPublished;

  const isPublished =
    typeof isPublishedRaw === "boolean"
      ? isPublishedRaw
      : typeof isPublishedRaw === "string"
        ? isPublishedRaw.toLowerCase() === "true"
        : true;

  return {
    title,
    incomingId,
    objectIdLike,
    courseDescription,
    thumbnail,
    isPublished,
  };
};

const buildNextCourseId = async () => {
  const rows = await Course.find({}).select("_id").lean();

  let max = 0;
  for (const row of rows) {
    const value = String(row?._id || "");
    const match = value.match(/^c(\d+)$/i);
    if (!match) continue;
    const n = Number(match[1]);
    if (Number.isFinite(n) && n > max) max = n;
  }

  return `c${max + 1}`;
};

const courseView = (courseDoc) => {
  const course = courseDoc?.toObject ? courseDoc.toObject() : courseDoc || {};
  const mappedTitle = course.title || "";

  return {
    _id: course._id,
    id: course._id,
    courseId: course._id,
    title: mappedTitle,
    courseTitle: mappedTitle,

    // persisted optional metadata
    courseDescription: course.courseDescription || "",
    thumbnail: course.thumbnail || "",
    isPublished:
      typeof course.isPublished === "boolean" ? course.isPublished : true,

    // optional metadata passthrough
    createdBy: course.createdBy || null,
    createdAt: course.createdAt || null,
    updatedAt: course.updatedAt || null,
  };
};

/**
 * @desc    Create a new course
 * @route   POST /api/v1/courses
 * @access  Private (Admin)
 */
export const createCourse = async (req, res) => {
  const {
    title,
    incomingId,
    objectIdLike,
    courseDescription,
    thumbnail,
    isPublished,
  } = normalizeCourseInput(req.body);

  if (!title) {
    throw AppError.validation("Course title is required", [
      { path: "title", message: "Course title is required", code: "required" },
    ]);
  }

  const existingByTitle = await Course.findOne({ title });
  if (existingByTitle) {
    throw AppError.conflict("A course with this title already exists", {
      field: "title",
    });
  }

  let finalId = incomingId || objectIdLike || null;
  if (!finalId) {
    finalId = await buildNextCourseId();
  } else {
    const existingById = await Course.findById(finalId);
    if (existingById) {
      throw AppError.conflict("A course with this id already exists", {
        field: "_id",
      });
    }
  }

  const created = await Course.create({
    _id: finalId,
    title,
    courseDescription,
    thumbnail,
    isPublished,
  });

  return res.status(201).json(
    successResponse({
      message: "Course created successfully",
      data: courseView(created),
    }),
  );
};

/**
 * @desc    Get all courses (paginated + searchable)
 * @route   GET /api/v1/courses
 * @access  Private (Admin)
 */
export const getCourses = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, 1, 10, 500);
  const sort = parseSort(req.query.sort, { _id: 1 });

  const filter = {};

  if (req.query.search) {
    const keyword = String(req.query.search).trim();
    filter.$or = [
      { title: { $regex: keyword, $options: "i" } },
      { courseDescription: { $regex: keyword, $options: "i" } },
    ];
  }

  const [courses, total] = await Promise.all([
    Course.find(filter).sort(sort).skip(skip).limit(limit),
    Course.countDocuments(filter),
  ]);

  const meta = buildPaginationMeta({ total, page, limit });

  return res.status(200).json(
    paginatedResponse({
      message: "Courses fetched successfully",
      data: courses.map(courseView),
      page: meta.page,
      limit: meta.limit,
      total: meta.total,
    }),
  );
};

/**
 * @desc    Get single course by id
 * @route   GET /api/v1/courses/:courseId
 * @access  Private (Admin)
 */
export const getCourseById = async (req, res) => {
  const { courseId } = req.params;
  const lookupId = String(courseId || "").trim();

  let course = await Course.findById(lookupId);

  // Backward compatibility: if consumers send ObjectId-style ids but collection
  // uses legacy ids, try alias fields as fallback.
  if (!course && lookupId) {
    course = await Course.findOne({
      $or: [{ _id: lookupId }, { id: lookupId }, { courseId: lookupId }],
    });
  }

  if (!course) {
    throw AppError.notFound("Course not found", { courseId });
  }

  const moduleCount = await Module.countDocuments({ courseId: course._id });
  const modules = await Module.find({ courseId: course._id })
    .select("_id")
    .lean();
  const moduleIds = modules.map((m) => m._id);

  const lessonCount =
    moduleIds.length > 0
      ? await Lesson.countDocuments({ moduleId: { $in: moduleIds } })
      : 0;

  return res.status(200).json(
    successResponse({
      message: "Course fetched successfully",
      data: {
        ...courseView(course),
        stats: {
          modules: moduleCount,
          lessons: lessonCount,
        },
      },
    }),
  );
};

/**
 * @desc    Update course by id
 * @route   PATCH /api/v1/courses/:courseId
 * @access  Private (Admin)
 */
export const updateCourse = async (req, res) => {
  const { courseId } = req.params;
  const lookupId = String(courseId || "").trim();

  let existing = await Course.findById(lookupId);

  if (!existing && lookupId) {
    existing = await Course.findOne({
      $or: [{ _id: lookupId }, { id: lookupId }, { courseId: lookupId }],
    });
  }

  if (!existing) {
    throw AppError.notFound("Course not found", { courseId });
  }

  const hasTitleField =
    req.body?.title !== undefined || req.body?.courseTitle !== undefined;

  const { title, courseDescription, thumbnail, isPublished } =
    normalizeCourseInput(req.body);

  if (hasTitleField) {
    if (!title) {
      throw AppError.validation("Course title is required", [
        {
          path: "title",
          message: "Course title is required",
          code: "required",
        },
      ]);
    }

    const duplicate = await Course.findOne({
      _id: { $ne: existing._id },
      title,
    });

    if (duplicate) {
      throw AppError.conflict("Another course with this title already exists", {
        field: "title",
      });
    }

    existing.title = title;
  }

  if (req.body?.courseDescription !== undefined) {
    existing.courseDescription = courseDescription;
  }

  if (req.body?.thumbnail !== undefined) {
    existing.thumbnail = thumbnail;
  }

  if (req.body?.isPublished !== undefined) {
    existing.isPublished = isPublished;
  }

  await existing.save();

  return res.status(200).json(
    successResponse({
      message: "Course updated successfully",
      data: courseView(existing),
    }),
  );
};

/**
 * @desc    Delete course by id (and cascade delete modules + lessons)
 * @route   DELETE /api/v1/courses/:courseId
 * @access  Private (Admin)
 */
export const deleteCourse = async (req, res) => {
  const { courseId } = req.params;
  const lookupId = String(courseId || "").trim();

  let course = await Course.findById(lookupId);

  if (!course && lookupId) {
    course = await Course.findOne({
      $or: [{ _id: lookupId }, { id: lookupId }, { courseId: lookupId }],
    });
  }

  if (!course) {
    throw AppError.notFound("Course not found", { courseId });
  }

  const modules = await Module.find({ courseId: course._id })
    .select("_id")
    .lean();
  const moduleIds = modules.map((m) => m._id);

  if (moduleIds.length > 0) {
    await Lesson.deleteMany({ moduleId: { $in: moduleIds } });
  }

  await Module.deleteMany({ courseId: course._id });
  await Course.deleteOne({ _id: course._id });

  return res.status(200).json(
    successResponse({
      message: "Course deleted successfully",
      data: {
        deletedCourseId: course._id,
        deletedModules: moduleIds.length,
      },
    }),
  );
};

export default {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
};
