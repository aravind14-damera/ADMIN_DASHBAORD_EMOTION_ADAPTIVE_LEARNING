import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Boxes, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

import { modulesApi, coursesApi } from "../../api/adminApi";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import EmptyState from "../../components/common/EmptyState";
import ConfirmModal from "../../components/common/ConfirmModal";

const initialForm = {
  moduleTitle: "",
  courseId: "",
};

const ModulesPage = () => {
  const [modules, setModules] = useState([]);
  const [courses, setCourses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState("");
  const [filterCourseId, setFilterCourseId] = useState("");

  const [page, setPage] = useState(1);
  const limit = 10;
  const [total, setTotal] = useState(0);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [form, setForm] = useState(initialForm);

  const [deleteTarget, setDeleteTarget] = useState(null);

  const isEditing = Boolean(editingModule);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const selectedCourse = useMemo(
    () => courses.find((c) => c._id === filterCourseId) || null,
    [courses, filterCourseId],
  );

  const headerStats = useMemo(
    () => [
      { label: "Total Modules", value: total, tone: "info" },
      {
        label: "Course Filter",
        value: selectedCourse?.courseTitle || "All Courses",
        tone: selectedCourse ? "success" : "default",
      },
      { label: "Page", value: `${page}/${totalPages}`, tone: "default" },
    ],
    [total, selectedCourse, page, totalPages],
  );

  const resetForm = () => {
    setForm(initialForm);
    setEditingModule(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditModal = (moduleItem) => {
    setEditingModule(moduleItem);
    setForm({
      moduleTitle: moduleItem.moduleTitle || "",
      courseId: moduleItem.courseId?._id || moduleItem.courseId || "",
    });
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    if (submitting) return;
    setIsFormOpen(false);
    resetForm();
  };

  const fetchCourses = async () => {
    setLoadingCourses(true);
    try {
      const res = await coursesApi.list({
        page: 1,
        limit: 200,
        sort: "courseTitle:asc",
      });

      const list = Array.isArray(res?.data) ? res.data : [];
      setCourses(list);
    } catch (error) {
      toast.error(error?.message || "Failed to load courses");
      setCourses([]);
    } finally {
      setLoadingCourses(false);
    }
  };

  const fetchModules = async () => {
    setLoading(true);
    try {
      const res = filterCourseId
        ? await modulesApi.listByCourse(filterCourseId, {
            page,
            limit,
            search: search || undefined,
            sort: "createdAt:desc",
          })
        : await modulesApi.list({
            page,
            limit,
            search: search || undefined,
            sort: "createdAt:desc",
          });

      let list = [];
      let totalCount = 0;

      if (filterCourseId) {
        list = Array.isArray(res?.data?.modules) ? res.data.modules : [];
        totalCount = res?.meta?.pagination?.total ?? list.length;
      } else {
        list = Array.isArray(res?.data) ? res.data : [];
        totalCount = res?.meta?.pagination?.total ?? list.length;
      }

      setModules(list);
      setTotal(Number(totalCount) || 0);
    } catch (error) {
      toast.error(error?.message || "Failed to load modules");
      setModules([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    fetchModules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, filterCourseId]);

  const validateForm = () => {
    const title = form.moduleTitle.trim();
    const courseId = form.courseId;

    if (!title || title.length < 2) {
      toast.error("Module title must be at least 2 characters");
      return false;
    }

    if (!courseId) {
      toast.error("Please select a course");
      return false;
    }

    return true;
  };

  const handleSubmitModule = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    const payload = {
      moduleTitle: form.moduleTitle.trim(),
      courseId: form.courseId,
    };

    setSubmitting(true);
    try {
      if (isEditing) {
        await modulesApi.update(editingModule._id, payload);
        toast.success("Module updated successfully");
      } else {
        await modulesApi.create(payload);
        toast.success("Module created successfully");
      }

      closeFormModal();
      setPage(1);
      await fetchModules();
    } catch (error) {
      toast.error(error?.message || "Failed to save module");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteModule = async () => {
    if (!deleteTarget?._id) return;

    setSubmitting(true);
    try {
      await modulesApi.remove(deleteTarget._id);
      toast.success("Module deleted successfully");
      setDeleteTarget(null);

      const nextTotal = Math.max(0, total - 1);
      const nextTotalPages = Math.max(1, Math.ceil(nextTotal / limit));
      if (page > nextTotalPages) setPage(nextTotalPages);

      await fetchModules();
    } catch (error) {
      toast.error(error?.message || "Failed to delete module");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Modules Management"
        subtitle="Manage learning modules and map each module to a course. Supports full CRUD with course-based filtering."
        showSearch
        searchValue={search}
        onSearchChange={(value) => {
          setPage(1);
          setSearch(value);
        }}
        searchPlaceholder="Search module title..."
        stats={headerStats}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterCourseId}
              onChange={(e) => {
                setPage(1);
                setFilterCourseId(e.target.value);
              }}
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              disabled={loadingCourses}
            >
              <option value="">All Courses</option>
              {courses.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.courseTitle}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={fetchModules}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
              disabled={loadingCourses || courses.length === 0}
            >
              <Plus className="h-4 w-4" />
              Add Module
            </button>
          </div>
        }
      />

      <section className="card overflow-hidden p-0">
        {loading ? (
          <Loader label="Loading modules..." />
        ) : modules.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={Boxes}
              title="No modules found"
              description={
                filterCourseId
                  ? "No modules are mapped to the selected course yet. Add your first module."
                  : "No modules available yet. Create a module and map it to a course."
              }
              action={
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                  disabled={courses.length === 0}
                >
                  Create Module
                </button>
              }
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-190 text-left">
                <thead className="bg-slate-50">
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3 font-semibold">Module Title</th>
                    <th className="px-5 py-3 font-semibold">Mapped Course</th>
                    <th className="px-5 py-3 font-semibold">Created At</th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {modules.map((moduleItem) => {
                    const mappedCourse =
                      moduleItem.courseId?.courseTitle || "Unknown Course";

                    return (
                      <tr
                        key={moduleItem._id}
                        className="border-t border-slate-200 text-sm"
                      >
                        <td className="px-5 py-4 font-medium text-slate-900">
                          {moduleItem.moduleTitle}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {mappedCourse}
                        </td>
                        <td className="px-5 py-4 text-slate-500">
                          {moduleItem.createdAt
                            ? new Date(
                                moduleItem.createdAt,
                              ).toLocaleDateString()
                            : "N/A"}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(moduleItem)}
                              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(moduleItem)}
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
                  {modules.length}
                </span>{" "}
                of <span className="font-medium text-slate-700">{total}</span>{" "}
                modules
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
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-lg font-semibold text-slate-900">
                {isEditing ? "Edit Module" : "Create New Module"}
              </h3>
            </div>

            <form onSubmit={handleSubmitModule} className="space-y-4 px-5 py-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Module Title
                </label>
                <input
                  type="text"
                  value={form.moduleTitle}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      moduleTitle: e.target.value,
                    }))
                  }
                  placeholder="e.g., Arrays"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Map to Course
                </label>
                <select
                  value={form.courseId}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, courseId: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">Select a course</option>
                  {courses.map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.courseTitle}
                    </option>
                  ))}
                </select>
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
                      ? "Update Module"
                      : "Create Module"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Module"
        description={`Are you sure you want to delete "${
          deleteTarget?.moduleTitle || "this module"
        }"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteModule}
        onCancel={() => (submitting ? null : setDeleteTarget(null))}
        isLoading={submitting}
        variant="danger"
      />
    </div>
  );
};

export default ModulesPage;
