import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Video,
  RefreshCw,
  Upload,
  Replace,
  XCircle,
  PlayCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import { lessonsApi, modulesApi } from "../../api/adminApi";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import EmptyState from "../../components/common/EmptyState";
import ConfirmModal from "../../components/common/ConfirmModal";
import { formatDurationSeconds } from "../../utils/format";

const initialForm = {
  lessonTitle: "",
  moduleId: "",
  description: "",
  duration: "",
  order: 1,
  isPublished: false,
};

const LessonsPage = () => {
  const [lessons, setLessons] = useState([]);
  const [modules, setModules] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingModules, setLoadingModules] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState("");
  const [filterModuleId, setFilterModuleId] = useState("");

  const [page, setPage] = useState(1);
  const limit = 10;
  const [total, setTotal] = useState(0);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [form, setForm] = useState(initialForm);

  const [deleteTarget, setDeleteTarget] = useState(null);

  const [videoTarget, setVideoTarget] = useState(null);
  const [videoAction, setVideoAction] = useState("upload"); // upload | replace
  const [videoFile, setVideoFile] = useState(null);

  const [removeVideoTarget, setRemoveVideoTarget] = useState(null);

  const isEditing = Boolean(editingLesson);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const selectedModule = useMemo(
    () => modules.find((m) => m._id === filterModuleId) || null,
    [modules, filterModuleId],
  );

  const headerStats = useMemo(
    () => [
      { label: "Total Lessons", value: total, tone: "info" },
      {
        label: "Module Filter",
        value: selectedModule?.moduleTitle || "All Modules",
        tone: selectedModule ? "success" : "default",
      },
      { label: "Page", value: `${page}/${totalPages}`, tone: "default" },
    ],
    [total, selectedModule, page, totalPages],
  );

  const resetForm = () => {
    setForm(initialForm);
    setEditingLesson(null);
  };

  const closeFormModal = () => {
    if (submitting) return;
    setIsFormOpen(false);
    resetForm();
  };

  const openCreateModal = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditModal = (lesson) => {
    setEditingLesson(lesson);

    const resolvedModuleId = lesson.moduleId?._id || lesson.moduleId || "";

    setForm({
      lessonTitle: lesson.lessonTitle || "",
      moduleId: resolvedModuleId,
      description: lesson.description || "",
      duration: lesson.duration ?? "",
      order: lesson.order ?? 1,
      isPublished: Boolean(lesson.isPublished),
    });

    setIsFormOpen(true);
  };

  const fetchModules = async () => {
    setLoadingModules(true);
    try {
      const res = await modulesApi.list({
        page: 1,
        limit: 500,
        sort: "moduleTitle:asc",
      });

      const list = Array.isArray(res?.data) ? res.data : [];
      setModules(list);
    } catch (error) {
      toast.error(error?.message || "Failed to load modules");
      setModules([]);
    } finally {
      setLoadingModules(false);
    }
  };

  const fetchLessons = async () => {
    setLoading(true);
    try {
      const res = await lessonsApi.list({
        page,
        limit,
        search: search || undefined,
        moduleId: filterModuleId || undefined,
        sort: "createdAt:desc",
      });

      const list = Array.isArray(res?.data) ? res.data : [];
      const totalCount = res?.meta?.pagination?.total ?? list.length;

      setLessons(list);
      setTotal(Number(totalCount) || 0);
    } catch (error) {
      toast.error(error?.message || "Failed to load lessons");
      setLessons([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  useEffect(() => {
    fetchLessons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, filterModuleId]);

  const validateForm = () => {
    const lessonTitle = form.lessonTitle.trim();
    const moduleId = form.moduleId;
    const duration = Number(form.duration);

    if (!lessonTitle || lessonTitle.length < 2) {
      toast.error("Lesson title must be at least 2 characters");
      return false;
    }

    if (!moduleId) {
      toast.error("Please select a module");
      return false;
    }

    if (form.duration !== "" && (!Number.isFinite(duration) || duration < 0)) {
      toast.error("Duration must be a non-negative number");
      return false;
    }

    if (!Number.isInteger(Number(form.order)) || Number(form.order) < 1) {
      toast.error("Order must be an integer greater than or equal to 1");
      return false;
    }

    return true;
  };

  const handleSubmitLesson = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    const payload = {
      lessonTitle: form.lessonTitle.trim(),
      moduleId: form.moduleId,
      description: form.description.trim(),
      duration: form.duration === "" ? 0 : Number(form.duration),
      order: Number(form.order),
      isPublished: Boolean(form.isPublished),
    };

    setSubmitting(true);
    try {
      if (isEditing) {
        await lessonsApi.update(editingLesson._id, payload);
        toast.success("Lesson updated successfully");
      } else {
        await lessonsApi.create(payload);
        toast.success("Lesson created successfully");
      }

      closeFormModal();
      setPage(1);
      await fetchLessons();
    } catch (error) {
      toast.error(error?.message || "Failed to save lesson");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLesson = async () => {
    if (!deleteTarget?._id) return;

    setSubmitting(true);
    try {
      await lessonsApi.remove(deleteTarget._id);
      toast.success("Lesson deleted successfully");
      setDeleteTarget(null);

      const nextTotal = Math.max(0, total - 1);
      const nextTotalPages = Math.max(1, Math.ceil(nextTotal / limit));
      if (page > nextTotalPages) setPage(nextTotalPages);

      await fetchLessons();
    } catch (error) {
      toast.error(error?.message || "Failed to delete lesson");
    } finally {
      setSubmitting(false);
    }
  };

  const openVideoModal = (lesson, action) => {
    setVideoTarget(lesson);
    setVideoAction(action);
    setVideoFile(null);
  };

  const closeVideoModal = () => {
    if (submitting) return;
    setVideoTarget(null);
    setVideoFile(null);
    setVideoAction("upload");
  };

  const handleUploadOrReplaceVideo = async () => {
    if (!videoTarget?._id) return;
    if (!videoFile) {
      toast.error("Please select a video file");
      return;
    }

    setSubmitting(true);
    try {
      if (videoAction === "replace") {
        await lessonsApi.replaceVideo(videoTarget._id, videoFile);
        toast.success("Lesson video replaced successfully");
      } else {
        await lessonsApi.uploadVideo(videoTarget._id, videoFile);
        toast.success("Lesson video uploaded successfully");
      }

      closeVideoModal();
      await fetchLessons();
    } catch (error) {
      toast.error(error?.message || "Video upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveVideo = async () => {
    if (!removeVideoTarget?._id) return;

    setSubmitting(true);
    try {
      await lessonsApi.removeVideo(removeVideoTarget._id);
      toast.success("Lesson video removed successfully");
      setRemoveVideoTarget(null);
      await fetchLessons();
    } catch (error) {
      toast.error(error?.message || "Failed to remove lesson video");
    } finally {
      setSubmitting(false);
    }
  };

  const getModuleLabel = (lesson) =>
    lesson.moduleId?.moduleTitle || "Unknown Module";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lessons Management"
        subtitle="Create, update, and organize lessons. Upload, replace, and remove lesson videos via Cloudinary-integrated APIs."
        showSearch
        searchValue={search}
        onSearchChange={(value) => {
          setPage(1);
          setSearch(value);
        }}
        searchPlaceholder="Search lesson title or description..."
        stats={headerStats}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterModuleId}
              onChange={(e) => {
                setPage(1);
                setFilterModuleId(e.target.value);
              }}
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              disabled={loadingModules}
            >
              <option value="">All Modules</option>
              {modules.map((module) => (
                <option key={module._id} value={module._id}>
                  {module.moduleTitle}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={fetchLessons}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
              disabled={loadingModules || modules.length === 0}
            >
              <Plus className="h-4 w-4" />
              Add Lesson
            </button>
          </div>
        }
      />

      <section className="card overflow-hidden p-0">
        {loading ? (
          <Loader label="Loading lessons..." />
        ) : lessons.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={PlayCircle}
              title="No lessons found"
              description={
                filterModuleId
                  ? "No lessons are available in this module yet. Add your first lesson."
                  : "No lessons available yet. Create a lesson and assign it to a module."
              }
              action={
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                  disabled={modules.length === 0}
                >
                  Create Lesson
                </button>
              }
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-275 text-left">
                <thead className="bg-slate-50">
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3 font-semibold">Lesson Title</th>
                    <th className="px-5 py-3 font-semibold">Module</th>
                    <th className="px-5 py-3 font-semibold">Duration</th>
                    <th className="px-5 py-3 font-semibold">Video</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Created At</th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lessons.map((lesson) => {
                    const hasVideo = Boolean(lesson.videoURL);
                    const durationLabel = formatDurationSeconds(
                      lesson.videoDuration || lesson.duration || 0,
                    );

                    return (
                      <tr
                        key={lesson._id}
                        className="border-t border-slate-200 text-sm"
                      >
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-900">
                            {lesson.lessonTitle}
                          </p>
                          {lesson.description ? (
                            <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                              {lesson.description}
                            </p>
                          ) : null}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {getModuleLabel(lesson)}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {durationLabel}
                        </td>

                        <td className="px-5 py-4">
                          {hasVideo ? (
                            <div className="flex items-center gap-2">
                              <a
                                href={lesson.videoURL}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                              >
                                <Video className="h-3.5 w-3.5" />
                                View
                              </a>
                              <button
                                type="button"
                                onClick={() =>
                                  openVideoModal(lesson, "replace")
                                }
                                className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                              >
                                <Replace className="h-3.5 w-3.5" />
                                Replace
                              </button>
                              <button
                                type="button"
                                onClick={() => setRemoveVideoTarget(lesson)}
                                className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Remove
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openVideoModal(lesson, "upload")}
                              className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                            >
                              <Upload className="h-3.5 w-3.5" />
                              Upload
                            </button>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${
                              lesson.isPublished
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {lesson.isPublished ? "Published" : "Draft"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-slate-500">
                          {new Date(lesson.createdAt).toLocaleDateString()}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(lesson)}
                              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(lesson)}
                              className="inline-flex items-center gap-1.5 rounded-md border border-rose-300 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
              <p className="text-sm text-slate-500">
                Showing{" "}
                <span className="font-medium text-slate-700">
                  {lessons.length}
                </span>{" "}
                of <span className="font-medium text-slate-700">{total}</span>{" "}
                lessons
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

      {/* Create/Edit Modal */}
      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-lg font-semibold text-slate-900">
                {isEditing ? "Edit Lesson" : "Create New Lesson"}
              </h3>
            </div>

            <form onSubmit={handleSubmitLesson} className="space-y-4 px-5 py-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Lesson Title
                </label>
                <input
                  type="text"
                  value={form.lessonTitle}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      lessonTitle: e.target.value,
                    }))
                  }
                  placeholder="e.g., Introduction to Trees"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Module
                  </label>
                  <select
                    value={form.moduleId}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, moduleId: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">Select module</option>
                    {modules.map((module) => (
                      <option key={module._id} value={module._id}>
                        {module.moduleTitle}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Duration (sec)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.duration}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          duration: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Order
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={form.order}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, order: e.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Add lesson summary..."
                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      isPublished: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Mark as published
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeFormModal}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {submitting
                    ? "Saving..."
                    : isEditing
                      ? "Update Lesson"
                      : "Create Lesson"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Upload/Replace Video Modal */}
      {videoTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-lg font-semibold text-slate-900">
                {videoAction === "replace"
                  ? "Replace Lesson Video"
                  : "Upload Lesson Video"}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {videoTarget.lessonTitle}
              </p>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                Supported video formats depend on backend validation. Large
                files may take longer to upload.
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Select Video File
                </label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  className="block w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {videoFile ? (
                  <p className="mt-2 text-xs text-slate-500">
                    {videoFile.name} ({Math.round(videoFile.size / 1024 / 1024)}{" "}
                    MB)
                  </p>
                ) : null}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeVideoModal}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUploadOrReplaceVideo}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  <Upload className="h-4 w-4" />
                  {submitting
                    ? "Processing..."
                    : videoAction === "replace"
                      ? "Replace Video"
                      : "Upload Video"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Lesson"
        description={`Are you sure you want to delete "${
          deleteTarget?.lessonTitle || "this lesson"
        }"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteLesson}
        onCancel={() => (submitting ? null : setDeleteTarget(null))}
        isLoading={submitting}
        variant="danger"
      />

      <ConfirmModal
        isOpen={Boolean(removeVideoTarget)}
        title="Remove Lesson Video"
        description={`Remove video from "${removeVideoTarget?.lessonTitle || "this lesson"}"? You can upload a new one later.`}
        confirmText="Remove Video"
        cancelText="Cancel"
        onConfirm={handleRemoveVideo}
        onCancel={() => (submitting ? null : setRemoveVideoTarget(null))}
        isLoading={submitting}
        variant="warning"
      />
    </div>
  );
};

export default LessonsPage;
