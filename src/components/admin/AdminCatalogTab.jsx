import { useCallback, useEffect, useState } from 'react';
import { adminApi, formatOrderTotal } from '../../admin/helpers';
import AdminPagination from './AdminPagination';

const categoryLabels = { computer: 'ПК / серверы', miner: 'Майнинг' };
const emptyProduct = { title: '', category: 'miner', sku: '', slug: '', price: '', stock: '', description: '', image: '', images: '', warranty: '', shippingTime: '', metadata: '{\n  "brand": "",\n  "model": "",\n  "algorithm": "",\n  "coins": "",\n  "hashrate": "",\n  "power": "",\n  "noise": "",\n  "size": "",\n  "weight": ""\n}', isActive: false };

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
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (category !== 'all') params.set('category', category);
    if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
    return adminApi(`/api/admin/products?${params}`)
      .then((data) => {
        setProducts(data.products);
        setPagination(data.pagination);
        setError('');
      })
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, [page, category, debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const openEdit = (product) => {
    setEditing(product.id);
    setForm({
      title: product.title,
      category: product.category,
      sku: product.sku || '',
      slug: product.slug || '',
      price: product.price,
      stock: product.stock ?? '',
      description: product.description,
      image: product.image || '',
      images: (product.images || []).join('\n'),
      warranty: product.warranty || '',
      shippingTime: product.shippingTime || '',
      metadata: JSON.stringify(product.metadata || {}, null, 2),
      isActive: product.isActive,
    });
  };

  const openNew = () => {
    setEditing('new');
    setForm(emptyProduct);
    setError('');
  };

  const save = async () => {
    try {
      const payload = {
          title: form.title,
          category: form.category,
          sku: form.sku,
          slug: form.slug,
          price: Number(form.price),
          stock: form.stock === '' ? null : Number(form.stock),
          description: form.description,
          image: form.image,
          images: form.images.split('\n').map((image) => image.trim()).filter(Boolean),
          warranty: form.warranty,
          shippingTime: form.shippingTime,
          metadata: JSON.parse(form.metadata || '{}'),
          isActive: form.isActive,
      };
      await adminApi(editing === 'new' ? '/api/admin/products' : `/api/admin/products/${editing}`, {
        method: editing === 'new' ? 'POST' : 'PATCH',
        body: JSON.stringify(payload),
      });
      setEditing(null);
      onNotice?.(payload.isActive ? 'Товар сохранён и опубликован' : 'Товар сохранён как черновик');
      await load();
    } catch (saveError) {
      setError(saveError.message);
    }
  };

  return (
    <div>
      <div className="admin-toolbar">
        <div className="admin-toolbar__row">
          <button type="button" className="btn" onClick={openNew}>Добавить товар</button>
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
          Товар без цены, остатка или фото не появится в корзине. Публикация доступна после заполнения обязательных характеристик.
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
              <th>Остаток</th>
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
                <td>{product.stock == null ? 'Не задан' : product.stock}</td>
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
              <h2>{editing === 'new' ? 'Новый товар' : `Редактирование · ${editing}`}</h2>
              <button type="button" className="admin-modal__close" onClick={() => setEditing(null)} aria-label="Закрыть">✕</button>
            </header>
            <div className="admin-modal__body admin-form">
              <label>Категория<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option value="miner">Майнинг</option><option value="computer">ПК / серверы</option><option value="other">Другое</option></select></label>
              <label>Название<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
              <label>Артикул SKU<input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></label>
              <label>Слаг ссылки<input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></label>
              <label>Цена (USD)<input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>
              <label>Остаток (шт.)<input type="number" min="0" step="1" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></label>
              <label>URL изображения<input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} /></label>
              <label>Дополнительные изображения (по одному URL на строку)<textarea rows={3} value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })} /></label>
              <label>Описание<textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
              <label>Гарантия<input value={form.warranty} onChange={(e) => setForm({ ...form, warranty: e.target.value })} /></label>
              <label>Срок поставки<input value={form.shippingTime} onChange={(e) => setForm({ ...form, shippingTime: e.target.value })} /></label>
              <label>Характеристики (JSON)<textarea rows={11} value={form.metadata} onChange={(e) => setForm({ ...form, metadata: e.target.value })} /><small className="admin-muted">Для публикации укажите brand, model; для майнера также algorithm, coins, hashrate, power, noise, size и weight.</small></label>
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
