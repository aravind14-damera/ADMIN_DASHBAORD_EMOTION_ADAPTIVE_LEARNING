export const successResponse = ({
  message = 'Request processed successfully',
  data = null,
  meta = null,
} = {}) => ({
  success: true,
  message,
  data,
  meta,
  timestamp: new Date().toISOString(),
});

export const errorResponse = ({
  message = 'Something went wrong',
  errors = null,
  code = 'INTERNAL_SERVER_ERROR',
} = {}) => ({
  success: false,
  message,
  code,
  errors,
  timestamp: new Date().toISOString(),
});

export const paginatedResponse = ({
  message = 'Data fetched successfully',
  data = [],
  page = 1,
  limit = 10,
  total = 0,
} = {}) => {
  const safePage = Number(page) > 0 ? Number(page) : 1;
  const safeLimit = Number(limit) > 0 ? Number(limit) : 10;
  const safeTotal = Number(total) >= 0 ? Number(total) : 0;

  return successResponse({
    message,
    data,
    meta: {
      pagination: {
        page: safePage,
        limit: safeLimit,
        total: safeTotal,
        totalPages: Math.ceil(safeTotal / safeLimit) || 1,
        hasNextPage: safePage * safeLimit < safeTotal,
        hasPrevPage: safePage > 1,
      },
    },
  });
};
