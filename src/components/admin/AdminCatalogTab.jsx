import { useEffect, useState } from 'react';
import { adminApi, formatOrderTotal } from '../../admin/helpers';
import AdminPagination from './AdminPagination';

const categoryLabels = { computer: 'ПК / серверы', miner: 'Майнинг' };

const AdminCatalogTab = ({ onNotice }) => {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (category !== 'all') params.set('category', category);
    if (search.trim()) params.set('q', search.trim());
    return adminApi(`/api/admin/products?${params}`)
      .then((data) => {
        setProducts(data.products);
        setPagination(data.pagination);
        setError('');
      })
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [page, category]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      load();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const openEdit = (product) => {
    setEditing(product.id);
    setForm({
      title: product.title,
      price: product.price,
      description: product.description,
      image: product.image || '',
      isActive: product.isActive,
    });
  };

  const save = async () => {
    try {
      await adminApi(`/api/admin/products/${editing}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: form.title,
          price: Number(form.price),
          description: form.description,
          image: form.image,
          isActive: form.isActive,
        }),
      });
      setEditing(null);
      onNotice?.('Товар сохранён');
      await load();
    } catch (saveError) {
      setError(saveError.message);
    }
  };

  return (
    <div>
      <div className="admin-toolbar">
        <div className="admin-toolbar__row">
          <input
            type="search"
            className="admin-toolbar__search"
            placeholder="Поиск по названию или ID"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className="admin-toolbar__select"
            value={category}
            onChange={(event) => { setCategory(event.target.value); setPage(1); }}
          >
            <option value="all">Все категории</option>
            <option value="computer">ПК / серверы</option>
            <option value="miner">Майнинг</option>
          </select>
        </div>
        <p className="admin-summary">
          «Скрыт» — товар не показывается на сайте. Майнеры должны быть «В продаже» и категория «Майнинг».
          После обновления сервера все Antminer включаются автоматически.
        </p>
      </div>
      {error && <p className="admin-error" role="alert">{error}</p>}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Категория</th>
              <th>Название</th>
              <th>Цена</th>
              <th>Статус</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td><code>{product.id}</code></td>
                <td>{categoryLabels[product.category] || product.category}</td>
                <td>{product.title}</td>
                <td>{formatOrderTotal({ total: product.price, currency: product.currency })}</td>
                <td>{product.isActive ? 'В продаже' : 'Скрыт'}</td>
                <td>
                  <button type="button" className="btn-outline admin-table__detail" onClick={() => openEdit(product)}>
                    Изменить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!products.length && !loading && <div className="admin-empty">Товары не найдены.</div>}
      </div>
      <AdminPagination pagination={pagination} onPageChange={setPage} disabled={loading} />

      {editing && (
        <div className="admin-modal-overlay" onClick={() => setEditing(null)} role="presentation">
          <div className="admin-modal" onClick={(event) => event.stopPropagation()} role="dialog">
            <header className="admin-modal__header">
              <h2>Редактирование · {editing}</h2>
              <button type="button" className="admin-modal__close" onClick={() => setEditing(null)} aria-label="Закрыть">✕</button>
            </header>
            <div className="admin-modal__body admin-form">
              <label>Название<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
              <label>Цена (USD)<input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>
              <label>URL изображения<input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} /></label>
              <label>Описание<textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
              <label className="admin-checkbox">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                Показывать на сайте
              </label>
              <div className="admin-actions">
                <button type="button" className="btn-outline" onClick={() => setEditing(null)}>Отмена</button>
                <button type="button" className="btn" onClick={save}>Сохранить</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCatalogTab;
