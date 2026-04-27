import { useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  ShieldBan,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";

import { usersApi } from "../../api/adminApi";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import EmptyState from "../../components/common/EmptyState";
import ConfirmModal from "../../components/common/ConfirmModal";
import {
  formatDateTime,
  formatDate,
  formatDurationMinutes,
  formatPercent,
} from "../../utils/format";

const PAGE_SIZE = 10;

const statusBadgeClass = {
  active: "bg-emerald-100 text-emerald-700",
  blocked: "bg-rose-100 text-rose-700",
  inactive: "bg-slate-200 text-slate-700",
};

const statusOptions = [
  { label: "All Statuses", value: "" },
  { label: "Active", value: "active" },
  { label: "Blocked", value: "blocked" },
  { label: "Inactive", value: "inactive" },
];

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [blockTarget, setBlockTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchUsers = async () => {
    setLoading(true);

    try {
      const response = await usersApi.list({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        status: status || undefined,
        sort: "createdAt:desc",
      });

      const list = Array.isArray(response?.data) ? response.data : [];
      const totalCount = Number(
        response?.meta?.pagination?.total ?? list.length,
      );

      setUsers(list);
      setTotal(totalCount);
    } catch (error) {
      toast.error(error?.message || "Failed to fetch users");
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, search]);

  const headerStats = useMemo(
    () => [
      { label: "Total Students", value: total, tone: "info" },
      { label: "Page", value: `${page}/${totalPages}`, tone: "default" },
      {
        label: "Filter",
        value: status || "all",
        tone: status ? "warning" : "default",
      },
    ],
    [page, total, totalPages, status],
  );

  const openBlockModal = (user) => setBlockTarget(user);
  const closeBlockModal = () => {
    if (actionLoading) return;
    setBlockTarget(null);
  };

  const openDeleteModal = (user) => setDeleteTarget(user);
  const closeDeleteModal = () => {
    if (actionLoading) return;
    setDeleteTarget(null);
  };

  const handleToggleBlock = async () => {
    if (!blockTarget?._id) return;

    const isBlocked = blockTarget.status === "blocked";
    const nextBlocked = !isBlocked;

    setActionLoading(true);
    try {
      await usersApi.setBlocked(blockTarget._id, nextBlocked);
      toast.success(
        nextBlocked
          ? "User blocked successfully"
          : "User unblocked successfully",
      );
      setBlockTarget(null);
      await fetchUsers();
    } catch (error) {
      toast.error(error?.message || "Failed to update user status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget?._id) return;

    setActionLoading(true);
    try {
      await usersApi.remove(deleteTarget._id);
      toast.success("User deleted successfully");
      setDeleteTarget(null);

      const nextTotal = Math.max(0, total - 1);
      const nextTotalPages = Math.max(1, Math.ceil(nextTotal / PAGE_SIZE));
      if (page > nextTotalPages) {
        setPage(nextTotalPages);
      } else {
        await fetchUsers();
      }
    } catch (error) {
      toast.error(error?.message || "Failed to delete user");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users Management"
        subtitle="Search and manage student accounts, monitor learning metrics, and take moderation actions."
        stats={headerStats}
        showSearch
        searchValue={search}
        onSearchChange={(value) => {
          setPage(1);
          setSearch(value);
        }}
        searchPlaceholder="Search by name or email..."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={status}
              onChange={(event) => {
                setPage(1);
                setStatus(event.target.value);
              }}
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={fetchUsers}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        }
      />

      <section className="card overflow-hidden p-0">
        {loading ? (
          <Loader label="Loading users..." />
        ) : users.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={Users}
              title="No users found"
              description="No student records match your current filters."
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-295 text-left">
                <thead className="bg-slate-50">
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3 font-semibold">Student</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Joined</th>
                    <th className="px-5 py-3 font-semibold">Last Active</th>
                    <th className="px-5 py-3 font-semibold">Last Login</th>
                    <th className="px-5 py-3 font-semibold">Progress</th>
                    <th className="px-5 py-3 font-semibold">Learning Time</th>
                    <th className="px-5 py-3 font-semibold">Lessons</th>
                    <th className="px-5 py-3 font-semibold">Streak</th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const statusValue = user.status || "inactive";
                    const isBlocked = statusValue === "blocked";

                    return (
                      <tr
                        key={user._id}
                        className="border-t border-slate-200 text-sm"
                      >
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-900">
                            {user.name || "Unknown"}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {user.email || "—"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              statusBadgeClass[statusValue] ||
                              statusBadgeClass.inactive
                            }`}
                          >
                            {statusValue}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {formatDate(user.joinedDate || user.createdAt)}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {formatDateTime(user.lastActive)}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {formatDateTime(user.lastLoginAt)}
                        </td>

                        <td className="px-5 py-4">
                          <div className="w-28">
                            <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                              <span>
                                {formatPercent(user.learningProgress || 0)}
                              </span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-200">
                              <div
                                className="h-2 rounded-full bg-indigo-600"
                                style={{
                                  width: `${Math.max(0, Math.min(100, Number(user.learningProgress || 0)))}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {formatDurationMinutes(
                            user.totalLearningTimeMinutes || 0,
                          )}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {user.lessonsWatched ?? 0}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {user.currentStreakDays ?? 0} days
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openBlockModal(user)}
                              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ${
                                isBlocked
                                  ? "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                  : "border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                              }`}
                            >
                              {isBlocked ? (
                                <>
                                  <ShieldCheck className="h-3.5 w-3.5" />
                                  Unblock
                                </>
                              ) : (
                                <>
                                  <ShieldBan className="h-3.5 w-3.5" />
                                  Block
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => openDeleteModal(user)}
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
                  {users.length}
                </span>{" "}
                of <span className="font-medium text-slate-700">{total}</span>{" "}
                users
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

      <ConfirmModal
        isOpen={Boolean(blockTarget)}
        title={
          blockTarget?.status === "blocked" ? "Unblock User" : "Block User"
        }
        description={
          blockTarget?.status === "blocked"
            ? `Unblock "${blockTarget?.name || "this user"}" and restore platform access?`
            : `Block "${blockTarget?.name || "this user"}" from accessing the learning platform?`
        }
        confirmText={blockTarget?.status === "blocked" ? "Unblock" : "Block"}
        cancelText="Cancel"
        onConfirm={handleToggleBlock}
        onCancel={closeBlockModal}
        isLoading={actionLoading}
        variant={blockTarget?.status === "blocked" ? "info" : "warning"}
      />

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete User"
        description={`Are you sure you want to permanently delete "${
          deleteTarget?.name || "this user"
        }"? This action cannot be undone.`}
        confirmText="Delete User"
        cancelText="Cancel"
        onConfirm={handleDeleteUser}
        onCancel={closeDeleteModal}
        isLoading={actionLoading}
        variant="danger"
      />
    </div>
  );
};

export default UsersPage;
