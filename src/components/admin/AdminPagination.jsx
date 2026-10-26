const AdminPagination = ({ pagination, onPageChange, disabled }) => {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages, total, limit } = pagination;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <nav className="admin-pagination" aria-label="Страницы">
      <span className="admin-pagination__meta">
        {from}–{to} из {total}
      </span>
      <div className="admin-pagination__actions">
        <button
          type="button"
          className="btn-outline"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Назад
        </button>
        <span className="admin-pagination__page">{page} / {totalPages}</span>
        <button
          type="button"
          className="btn-outline"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Вперёд
        </button>
      </div>
    </nav>
  );
};

export default AdminPagination;
