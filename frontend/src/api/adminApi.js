import client from "./client";

const unwrap = (response) => response ?? null;

/**
 * Generic helpers
 */
const get = (url, config = {}) => client.get(url, config).then(unwrap);
const post = (url, body = {}, config = {}) =>
  client.post(url, body, config).then(unwrap);
const patch = (url, body = {}, config = {}) =>
  client.patch(url, body, config).then(unwrap);
const put = (url, body = {}, config = {}) =>
  client.put(url, body, config).then(unwrap);
const del = (url, config = {}) => client.delete(url, config).then(unwrap);

const toQueryString = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.append(key, String(value));
  });

  const q = query.toString();
  return q ? `?${q}` : "";
};

const buildPaginatedQuery = ({
  page = 1,
  limit = 10,
  search,
  sort,
  ...rest
} = {}) =>
  toQueryString({
    page,
    limit,
    search,
    sort,
    ...rest,
  });

/**
 * Auth APIs
 */
export const authApi = {
  signup(payload) {
    return post("/auth/signup", payload);
  },

  login(payload) {
    return post("/auth/login", payload);
  },

  logout() {
    return post("/auth/logout");
  },

  getSession() {
    return get("/auth/session");
  },
};

/**
 * Dashboard APIs
 */
export const dashboardApi = {
  getOverview() {
    return get("/dashboard/overview");
  },

  getSummaryCards() {
    return get("/dashboard/summary-cards");
  },
};

/**
 * Courses APIs
 */
export const coursesApi = {
  list(params = {}) {
    return get(`/courses${buildPaginatedQuery(params)}`);
  },

  getById(courseId) {
    return get(`/courses/${courseId}`);
  },

  create(payload) {
    return post("/courses", payload);
  },

  update(courseId, payload) {
    return patch(`/courses/${courseId}`, payload);
  },

  remove(courseId) {
    return del(`/courses/${courseId}`);
  },
};

/**
 * Modules APIs
 */
export const modulesApi = {
  list(params = {}) {
    return get(`/modules${buildPaginatedQuery(params)}`);
  },

  listByCourse(courseId, params = {}) {
    return get(`/modules/course/${courseId}${buildPaginatedQuery(params)}`);
  },

  getById(moduleId) {
    return get(`/modules/${moduleId}`);
  },

  create(payload) {
    return post("/modules", payload);
  },

  update(moduleId, payload) {
    return patch(`/modules/${moduleId}`, payload);
  },

  remove(moduleId) {
    return del(`/modules/${moduleId}`);
  },
};

/**
 * Lessons APIs
 */
export const lessonsApi = {
  list(params = {}) {
    return get(`/lessons${buildPaginatedQuery(params)}`);
  },

  getById(lessonId) {
    return get(`/lessons/${lessonId}`);
  },

  create(payload) {
    return post("/lessons", payload);
  },

  update(lessonId, payload) {
    return patch(`/lessons/${lessonId}`, payload);
  },

  remove(lessonId) {
    return del(`/lessons/${lessonId}`);
  },

  uploadVideo(lessonId, file, extraFields = {}) {
    const formData = new FormData();
    formData.append("video", file);

    Object.entries(extraFields).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    return post(`/lessons/${lessonId}/video`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  replaceVideo(lessonId, file, extraFields = {}) {
    const formData = new FormData();
    formData.append("video", file);

    Object.entries(extraFields).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    return put(`/lessons/${lessonId}/video`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  removeVideo(lessonId) {
    return del(`/lessons/${lessonId}/video`);
  },
};

/**
 * Users APIs
 */
export const usersApi = {
  list(params = {}) {
    return get(`/users${buildPaginatedQuery(params)}`);
  },

  getById(userId) {
    return get(`/users/${userId}`);
  },

  create(payload) {
    return post("/users", payload);
  },

  update(userId, payload) {
    return patch(`/users/${userId}`, payload);
  },

  setBlocked(userId, blocked) {
    return patch(`/users/${userId}/block`, { blocked: Boolean(blocked) });
  },

  remove(userId) {
    return del(`/users/${userId}`);
  },
};

/**
 * Emotion Analytics APIs
 */
export const emotionsApi = {
  list(params = {}) {
    return get(`/emotions${buildPaginatedQuery(params)}`);
  },

  latest() {
    return get("/emotions/latest");
  },

  dashboardSummary(params = {}) {
    return get(`/emotions/summary/dashboard${toQueryString(params)}`);
  },

  create(payload) {
    return post("/emotions", payload);
  },

  update(id, payload) {
    return patch(`/emotions/${id}`, payload);
  },

  remove(id) {
    return del(`/emotions/${id}`);
  },
};

/**
 * Student Activity APIs
 */
export const activityApi = {
  list(params = {}) {
    return get(`/activity${buildPaginatedQuery(params)}`);
  },

  summary() {
    return get("/activity/summary");
  },

  getById(id) {
    return get(`/activity/${id}`);
  },

  create(payload) {
    return post("/activity", payload);
  },

  update(id, payload) {
    return patch(`/activity/${id}`, payload);
  },

  remove(id) {
    return del(`/activity/${id}`);
  },

  upsertByUser(userId, payload) {
    return put(`/activity/user/${userId}`, payload);
  },
};

/**
 * AI Insights APIs
 */
export const insightsApi = {
  list(params = {}) {
    return get(`/insights${buildPaginatedQuery(params)}`);
  },

  latest(limit = 6) {
    return get(`/insights/latest${toQueryString({ limit })}`);
  },

  summary() {
    return get("/insights/summary");
  },

  getById(id) {
    return get(`/insights/${id}`);
  },

  create(payload) {
    return post("/insights", payload);
  },

  update(id, payload) {
    return patch(`/insights/${id}`, payload);
  },

  markActioned(id, payload = { isActioned: true, actionNote: "" }) {
    return patch(`/insights/${id}/action`, payload);
  },

  bulkMarkActioned(payload) {
    return patch("/insights/action/bulk", payload);
  },

  remove(id) {
    return del(`/insights/${id}`);
  },
};

/**
 * Settings APIs
 */
export const settingsApi = {
  getSystem() {
    return get("/settings");
  },

  updateSystem(payload) {
    return patch("/settings", payload);
  },

  updateProfile(payload) {
    return patch("/settings/profile", payload);
  },

  updateEmotionTracking(payload) {
    return patch("/settings/emotion-tracking", payload);
  },

  refreshCloudinaryStatus() {
    return post("/settings/cloudinary/refresh");
  },

  setCloudinaryStatus(payload) {
    return patch("/settings/cloudinary", payload);
  },
};

/**
 * Unified export (optional convenience usage):
 * adminApi.courses.list(...)
 */
const adminApi = {
  auth: authApi,
  dashboard: dashboardApi,
  courses: coursesApi,
  modules: modulesApi,
  lessons: lessonsApi,
  users: usersApi,
  emotions: emotionsApi,
  activity: activityApi,
  insights: insightsApi,
  settings: settingsApi,
};

export default adminApi;
