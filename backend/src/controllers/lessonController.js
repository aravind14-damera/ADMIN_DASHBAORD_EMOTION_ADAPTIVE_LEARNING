import Lesson from "../models/Lesson.js";
import Module from "../models/Module.js";
import cloudinaryService from "../services/cloudinaryService.js";
import AppError from "../utils/AppError.js";
import { successResponse, paginatedResponse } from "../utils/apiResponse.js";
import {
  getPagination,
  parseSort,
  buildPaginationMeta,
} from "../utils/helpers.js";

/**
 * Normalize lesson payload for existing collection schema:
 * {
 *   _id: ObjectId,
 *   lesson_id: string,
 *   moduleId: string,
 *   title: string,
 *   videoUrl: string
 * }
 */
const normalizeLessonInput = (body = {}) => {
  const title = String(body.title || body.lessonTitle || "").trim();

  const moduleIdRaw = body.moduleId ?? body.module_id ?? "";
  const moduleId = String(moduleIdRaw || "").trim();

  const videoUrlRaw = body.videoUrl ?? body.videoURL ?? "";
  const videoUrl = String(videoUrlRaw || "").trim();

  const incomingLessonIdRaw = body.lesson_id ?? body.lessonId ?? body.id ?? "";
  const lesson_id = String(incomingLessonIdRaw || "").trim();

  return { title, moduleId, videoUrl, lesson_id };
};

const buildNextLessonLegacyId = async () => {
  const rows = await Lesson.find({}).select("lesson_id").lean();

  let max = 0;
  for (const row of rows) {
    const value = String(row?.lesson_id || "");
    const match = value.match(/^l(\d+)$/i);
    if (!match) continue;
    const n = Number(match[1]);
    if (Number.isFinite(n) && n > max) max = n;
  }

  return `l${max + 1}`;
};

const lessonView = (lessonDoc) => ({
  _id: lessonDoc._id,
  lesson_id: lessonDoc.lesson_id,
  lessonTitle: lessonDoc.title,
  title: lessonDoc.title,
  moduleId: lessonDoc.moduleId,
  videoUrl: lessonDoc.videoUrl || "",
  videoURL: lessonDoc.videoUrl || "",
  hasVideo: Boolean(lessonDoc.videoUrl),
});

/**
 * @desc    Create a lesson
 * @route   POST /api/v1/lessons
 * @access  Private (Admin)
 */
export const createLesson = async (req, res, next) => {
  try {
    const { title, moduleId, videoUrl, lesson_id } = normalizeLessonInput(
      req.body,
    );

    if (!title) {
      throw AppError.validation("Lesson title is required", [
        {
          path: "title",
          message: "Lesson title is required",
          code: "required",
        },
      ]);
    }

    if (!moduleId) {
      throw AppError.validation("Module id is required", [
        {
          path: "moduleId",
          message: "Module id is required",
          code: "required",
        },
      ]);
    }

    const moduleExists = await Module.findById(moduleId).lean();
    if (!moduleExists) {
      return next(AppError.notFound("Module not found", { moduleId }));
    }

    let finalLessonId = lesson_id;
    if (!finalLessonId) {
      finalLessonId = await buildNextLessonLegacyId();
    } else {
      const duplicateLegacyId = await Lesson.findOne({
        lesson_id: finalLessonId,
      }).lean();
      if (duplicateLegacyId) {
        return next(
          AppError.conflict("A lesson with this lesson_id already exists", {
            field: "lesson_id",
          }),
        );
      }
    }

    const duplicateTitleInModule = await Lesson.findOne({
      moduleId,
      title,
    }).lean();

    if (duplicateTitleInModule) {
      return next(
        AppError.conflict(
          "A lesson with this title already exists in this module",
          {
            moduleId,
            title,
          },
        ),
      );
    }

    const lesson = await Lesson.create({
      lesson_id: finalLessonId,
      moduleId,
      title,
      videoUrl,
    });

    return res.status(201).json(
      successResponse({
        message: "Lesson created successfully",
        data: lessonView(lesson),
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    List lessons (with filters)
 * @route   GET /api/v1/lessons
 * @access  Private (Admin)
 */
export const getLessons = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query, 1, 10, 100);
    const sort = parseSort(req.query.sort, { lesson_id: 1 });

    const filter = {};
    if (req.query.moduleId) {
      filter.moduleId = String(req.query.moduleId).trim();
    }

    if (req.query.search) {
      const keyword = String(req.query.search).trim();
      filter.title = { $regex: keyword, $options: "i" };
    }

    const [lessons, total] = await Promise.all([
      Lesson.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("moduleId", "_id title courseId"),
      Lesson.countDocuments(filter),
    ]);

    const meta = buildPaginationMeta({ total, page, limit });

    return res.status(200).json(
      paginatedResponse({
        message: "Lessons fetched successfully",
        data: lessons.map((l) => lessonView(l)),
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
 * @desc    Get single lesson by ID
 * @route   GET /api/v1/lessons/:lessonId
 * @access  Private (Admin)
 */
export const getLessonById = async (req, res, next) => {
  try {
    const { lessonId } = req.params;

    const lesson = await Lesson.findById(lessonId).populate(
      "moduleId",
      "_id title courseId",
    );

    if (!lesson) {
      return next(AppError.notFound("Lesson not found", { lessonId }));
    }

    return res.status(200).json(
      successResponse({
        message: "Lesson fetched successfully",
        data: lessonView(lesson),
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Update lesson by ID
 * @route   PATCH /api/v1/lessons/:lessonId
 * @access  Private (Admin)
 */
export const updateLesson = async (req, res, next) => {
  try {
    const { lessonId } = req.params;

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return next(AppError.notFound("Lesson not found", { lessonId }));
    }

    const { title, moduleId, videoUrl, lesson_id } = normalizeLessonInput(
      req.body,
    );

    const nextModuleId = moduleId || lesson.moduleId;
    const nextTitle = title || lesson.title;

    if (!nextTitle) {
      throw AppError.validation("Lesson title is required", [
        {
          path: "title",
          message: "Lesson title is required",
          code: "required",
        },
      ]);
    }

    if (!nextModuleId) {
      throw AppError.validation("Module id is required", [
        {
          path: "moduleId",
          message: "Module id is required",
          code: "required",
        },
      ]);
    }

    if (moduleId && moduleId !== lesson.moduleId) {
      const moduleExists = await Module.findById(moduleId).select("_id").lean();
      if (!moduleExists) {
        return next(AppError.notFound("Target module not found", { moduleId }));
      }
    }

    const duplicateTitle = await Lesson.findOne({
      _id: { $ne: lesson._id },
      moduleId: nextModuleId,
      title: nextTitle,
    }).lean();

    if (duplicateTitle) {
      return next(
        AppError.conflict(
          "Another lesson with this title already exists in this module",
          {
            moduleId: nextModuleId,
            title: nextTitle,
          },
        ),
      );
    }

    if (lesson_id && lesson_id !== lesson.lesson_id) {
      const duplicateLegacyId = await Lesson.findOne({
        _id: { $ne: lesson._id },
        lesson_id,
      }).lean();

      if (duplicateLegacyId) {
        return next(
          AppError.conflict("Another lesson already uses this lesson_id", {
            field: "lesson_id",
          }),
        );
      }

      lesson.lesson_id = lesson_id;
    }

    lesson.title = nextTitle;
    lesson.moduleId = nextModuleId;
    if (videoUrl) {
      lesson.videoUrl = videoUrl;
    }

    await lesson.save();

    return res.status(200).json(
      successResponse({
        message: "Lesson updated successfully",
        data: lessonView(lesson),
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Delete lesson by ID
 * @route   DELETE /api/v1/lessons/:lessonId
 * @access  Private (Admin)
 */
export const deleteLesson = async (req, res, next) => {
  try {
    const { lessonId } = req.params;

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return next(AppError.notFound("Lesson not found", { lessonId }));
    }

    await Lesson.deleteOne({ _id: lesson._id });

    return res.status(200).json(
      successResponse({
        message: "Lesson deleted successfully",
        data: { deletedLessonId: lesson._id, lesson_id: lesson.lesson_id },
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Upload lesson video to Cloudinary and store URL in `videoUrl`
 * @route   POST /api/v1/lessons/:lessonId/video
 * @access  Private (Admin)
 */
export const uploadLessonVideo = async (req, res, next) => {
  try {
    const { lessonId } = req.params;
    const file = req.file;

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return next(AppError.notFound("Lesson not found", { lessonId }));
    }

    if (!file) {
      return next(AppError.badRequest("No video file uploaded"));
    }

    const uploaded = await cloudinaryService.uploadVideoBuffer({
      file,
      context: {
        lessonId: lesson._id.toString(),
        lessonTitle: lesson.title,
      },
    });

    lesson.videoUrl = uploaded.url;
    await lesson.save();

    return res.status(200).json(
      successResponse({
        message: "Lesson video uploaded successfully",
        data: {
          lesson: lessonView(lesson),
          video: uploaded,
        },
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Replace lesson video in Cloudinary and update `videoUrl`
 * @route   PUT /api/v1/lessons/:lessonId/video
 * @access  Private (Admin)
 */
export const replaceLessonVideo = uploadLessonVideo;

/**
 * @desc    Remove lesson video URL reference
 * @route   DELETE /api/v1/lessons/:lessonId/video
 * @access  Private (Admin)
 */
export const removeLessonVideo = async (req, res, next) => {
  try {
    const { lessonId } = req.params;

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return next(AppError.notFound("Lesson not found", { lessonId }));
    }

    if (!lesson.videoUrl) {
      return res.status(200).json(
        successResponse({
          message: "No video found for this lesson. Nothing to remove.",
          data: lessonView(lesson),
        }),
      );
    }

    lesson.videoUrl = "";
    await lesson.save();

    return res.status(200).json(
      successResponse({
        message: "Lesson video removed successfully",
        data: lessonView(lesson),
      }),
    );
  } catch (error) {
    return next(error);
  }
};

export default {
  createLesson,
  getLessons,
  getLessonById,
  updateLesson,
  deleteLesson,
  uploadLessonVideo,
  replaceLessonVideo,
  removeLessonVideo,
};
