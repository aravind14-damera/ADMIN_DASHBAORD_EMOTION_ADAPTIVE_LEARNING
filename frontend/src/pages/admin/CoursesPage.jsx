import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, BookOpen, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

import { coursesApi } from "../../api/adminApi";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import EmptyState from "../../components/common/EmptyState";
import ConfirmModal from "../../components/common/ConfirmModal";

const initialForm = {
  courseTitle: "",
  courseDescription: "",
  thumbnail: "",
};

const CoursesPage = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;
  const [total, setTotal] = useState(0);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [form, setForm] = useState(initialForm);

  const [deleteTarget, setDeleteTarget] = useState(null);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const isEditing = Boolean(editingCourse);

  const pageTitle = "Courses Management";
  const pageSubtitle =
    "Create, edit, and maintain all courses. This section supports full CRUD workflows for production usage.";

  const stats = useMemo(
    () => [
      { label: "Total Courses", value: total, tone: "info" },
      {
        label: "Current Page",
        value: `${page}/${totalPages}`,
        tone: "default",
      },
    ],
    [total, page, totalPages],
  );

  const resetForm = () => {
    setForm(initialForm);
    setEditingCourse(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditModal = (course) => {
    setEditingCourse(course);
    setForm({
      courseTitle: course.courseTitle || "",
      courseDescription: course.courseDescription || "",
      thumbnail: course.thumbnail || "",
    });
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    if (submitting) return;
    setIsFormOpen(false);
    resetForm();
  };

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await coursesApi.list({
        page,
        limit,
        search: search || undefined,
        sort: "createdAt:desc",
      });

      const list = Array.isArray(res?.data) ? res.data : [];
      const totalCount = res?.meta?.pagination?.total ?? list.length;

      setCourses(list);
      setTotal(Number(totalCount) || 0);
    } catch (error) {
      toast.error(error?.message || "Failed to fetch courses");
      setCourses([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  const validateForm = () => {
    const title = form.courseTitle.trim();
    const description = form.courseDescription.trim();
    const thumbnail = form.thumbnail.trim();

    if (!title || title.length < 3) {
      toast.error("Course title must be at least 3 characters");
      return false;
    }

    if (!description || description.length < 10) {
      toast.error("Course description must be at least 10 characters");
      return false;
    }

    if (thumbnail) {
      try {
        new URL(thumbnail);
      } catch {
        toast.error("Thumbnail must be a valid URL");
        return false;
      }
    }

    return true;
  };

  const handleSubmitCourse = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    const payload = {
      courseTitle: form.courseTitle.trim(),
      courseDescription: form.courseDescription.trim(),
      thumbnail: form.thumbnail.trim(),
    };

    setSubmitting(true);
    try {
      if (isEditing) {
        await coursesApi.update(editingCourse._id, payload);
        toast.success("Course updated successfully");
      } else {
        await coursesApi.create(payload);
        toast.success("Course created successfully");
      }

      closeFormModal();
      setPage(1);
      await fetchCourses();
    } catch (error) {
      toast.error(error?.message || "Failed to save course");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!deleteTarget?._id) return;

    setSubmitting(true);
    try {
      await coursesApi.remove(deleteTarget._id);
      toast.success("Course deleted successfully");
      setDeleteTarget(null);

      // If last item deleted on page, navigate back one page when possible
      const nextTotal = Math.max(0, total - 1);
      const nextTotalPages = Math.max(1, Math.ceil(nextTotal / limit));
      if (page > nextTotalPages) setPage(nextTotalPages);

      await fetchCourses();
    } catch (error) {
      toast.error(error?.message || "Failed to delete course");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        showSearch
        searchValue={search}
        onSearchChange={(value) => {
          setPage(1);
          setSearch(value);
        }}
        searchPlaceholder="Search by title or description..."
        stats={stats}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchCourses}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Add Course
            </button>
          </div>
        }
      />

      <section className="card overflow-hidden p-0">
        {loading ? (
          <Loader label="Loading courses..." />
        ) : courses.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={BookOpen}
              title="No courses found"
              description="Start by creating your first course. You can add modules and lessons afterward."
              action={
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  Create Course
                </button>
              }
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-205 text-left">
                <thead className="bg-slate-50">
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3 font-semibold">Title</th>
                    <th className="px-5 py-3 font-semibold">Description</th>
                    <th className="px-5 py-3 font-semibold">Created At</th>
                    <th className="px-5 py-3 font-semibold">Thumbnail</th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => (
                    <tr
                      key={course._id}
                      className="border-t border-slate-200 text-sm"
                    >
                      <td className="px-5 py-4 font-medium text-slate-900">
                        {course.courseTitle}
                      </td>
                      <td className="max-w-105 px-5 py-4 text-slate-600">
                        <p className="line-clamp-2">
                          {course.courseDescription}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-slate-500">
                        {course.createdAt
                          ? new Date(course.createdAt).toLocaleDateString()
                          : "N/A"}
                      </td>
                      <td className="px-5 py-4">
                        {course.thumbnail ? (
                          <a
                            href={course.thumbnail}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 hover:text-indigo-700 hover:underline"
                          >
                            View
                          </a>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(course)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(course)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-rose-300 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
              <p className="text-sm text-slate-500">
                Showing{" "}
                <span className="font-medium text-slate-700">
                  {courses.length}
                </span>{" "}
                of <span className="font-medium text-slate-700">{total}</span>{" "}
                courses
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

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-lg font-semibold text-slate-900">
                {isEditing ? "Edit Course" : "Create New Course"}
              </h3>
            </div>

            <form onSubmit={handleSubmitCourse} className="space-y-4 px-5 py-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Course Title
                </label>
                <input
                  type="text"
                  value={form.courseTitle}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      courseTitle: e.target.value,
                    }))
                  }
                  placeholder="e.g., Python Programming"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Course Description
                </label>
                <textarea
                  rows={5}
                  value={form.courseDescription}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      courseDescription: e.target.value,
                    }))
                  }
                  placeholder="Write a clear course overview..."
                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Thumbnail URL (optional)
                </label>
                <input
                  type="url"
                  value={form.thumbnail}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, thumbnail: e.target.value }))
                  }
                  placeholder="https://..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

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
                      ? "Update Course"
                      : "Create Course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Course"
        description={`Are you sure you want to delete "${
          deleteTarget?.courseTitle || "this course"
        }"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteCourse}
        onCancel={() => (submitting ? null : setDeleteTarget(null))}
        isLoading={submitting}
        variant="danger"
      />
    </div>
  );
};

export default CoursesPage;
