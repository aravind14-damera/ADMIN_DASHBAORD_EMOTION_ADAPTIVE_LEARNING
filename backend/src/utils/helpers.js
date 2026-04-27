import mongoose from "mongoose";

/**
 * Validate whether a value is a valid Mongo ObjectId.
 * @param {string} id
 * @returns {boolean}
 */
export const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Safely convert a value to Mongo ObjectId.
 * Returns null if invalid.
 * @param {string} id
 * @returns {mongoose.Types.ObjectId | null}
 */
export const toObjectId = (id) => {
  if (!isValidObjectId(id)) return null;
  return new mongoose.Types.ObjectId(id);
};

/**
 * Build pagination values from query params.
 * @param {object} query
 * @param {number} [defaultPage=1]
 * @param {number} [defaultLimit=10]
 * @param {number} [maxLimit=100]
 * @returns {{ page: number, limit: number, skip: number }}
 */
export const getPagination = (
  query = {},
  defaultPage = 1,
  defaultLimit = 10,
  maxLimit = 100
) => {
  const rawPage = Number(query.page);
  const rawLimit = Number(query.limit);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : defaultPage;
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), maxLimit)
      : defaultLimit;

  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Build common pagination metadata.
 * @param {object} params
 * @param {number} params.total
 * @param {number} params.page
 * @param {number} params.limit
 * @returns {{ page: number, limit: number, total: number, totalPages: number, hasNextPage: boolean, hasPrevPage: boolean }}
 */
export const buildPaginationMeta = ({ total = 0, page = 1, limit = 10 } = {}) => {
  const safeTotal = Math.max(0, Number(total) || 0);
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Number(limit) || 10);

  const totalPages = Math.max(1, Math.ceil(safeTotal / safeLimit));

  return {
    page: safePage,
    limit: safeLimit,
    total: safeTotal,
    totalPages,
    hasNextPage: safePage < totalPages,
    hasPrevPage: safePage > 1,
  };
};

/**
 * Return a normalized sorting object for mongoose queries.
 * Example input: "createdAt:desc,name:asc"
 * @param {string} sort
 * @param {object} fallback
 * @returns {object}
 */
export const parseSort = (sort, fallback = { createdAt: -1 }) => {
  if (!sort || typeof sort !== "string") return fallback;

  const pairs = sort
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.split(":"));

  if (!pairs.length) return fallback;

  const sortObj = {};
  for (const [field, direction = "asc"] of pairs) {
    if (!field) continue;
    sortObj[field] = direction.toLowerCase() === "desc" ? -1 : 1;
  }

  return Object.keys(sortObj).length ? sortObj : fallback;
};
