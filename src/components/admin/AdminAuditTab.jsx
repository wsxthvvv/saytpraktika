import { useEffect, useState } from 'react';
import { adminApi, formatAdminDate } from '../../admin/helpers';
import AdminPagination from './AdminPagination';

const actionLabels = {
  'lead.status': 'Статус заявки',
  'order.status': 'Статус заказа',
  'review.status': 'Модерация отзыва',
  'product.update': 'Изменение товара',
};

const AdminAuditTab = () => {
  const [audit, setAudit] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    adminApi(`/api/admin/audit?page=${page}&limit=25`)
      .then((data) => {
        setAudit(data.audit);
        setPagination(data.pagination);
        setError('');
      })
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="admin-panel-block admin-panel-block--flush">
      <h2>Журнал действий администратора</h2>
      {error && <p className="admin-error" role="alert">{error}</p>}
      {loading && <p className="admin-muted">Загрузка…</p>}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Админ</th>
              <th>Действие</th>
              <th>Объект</th>
              <th>Детали</th>
            </tr>
          </thead>
          <tbody>
            {audit.map((row) => (
              <tr key={row.id}>
                <td>{formatAdminDate(row.createdAt)}</td>
                <td>{row.adminEmail || '—'}</td>
                <td>{actionLabels[row.action] || row.action}</td>
                <td>{row.entityType} #{String(row.entityId).slice(0, 12)}</td>
                <td><code className="admin-code">{JSON.stringify(row.details)}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!audit.length && !loading && <div className="admin-empty">Записей пока нет.</div>}
      </div>
      <AdminPagination pagination={pagination} onPageChange={setPage} disabled={loading} />
    </div>
  );
};

export default AdminAuditTab;
