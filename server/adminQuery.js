const parseAdminListParams = (url, clip) => {
  const page = Math.max(1, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1);
  const limit = Math.min(100, Math.max(5, Number.parseInt(url.searchParams.get('limit') || '20', 10) || 20));
  const offset = (page - 1) * limit;
  const q = clip(url.searchParams.get('q') || '', 120);
  const status = clip(url.searchParams.get('status') || '', 40);
  const type = clip(url.searchParams.get('type') || '', 40);
  const category = clip(url.searchParams.get('category') || '', 40);
  return { page, limit, offset, q, status, type, category };
};

const paginationMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});

const appendSearch = (fields, q, values, paramIndexStart = 1) => {
  if (!q) return { clause: '', values, nextIndex: paramIndexStart };
  const idx = paramIndexStart + values.length;
  const pattern = `%${q.replace(/[%_]/g, '')}%`;
  values.push(pattern);
  const clause = ` AND (${fields.map((field) => `${field} ILIKE $${idx}`).join(' OR ')})`;
  return { clause, values, nextIndex: idx + 1 };
};

module.exports = { parseAdminListParams, paginationMeta, appendSearch };
