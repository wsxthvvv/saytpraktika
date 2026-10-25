import { useEffect, useState } from 'react';

const ORDER_STATUSES = ['Ожидание', 'В работе', 'Завершена', 'Отменена'];
const LEAD_STATUSES = ['Новая', 'В работе', 'Завершена', 'Отменена'];
const REVIEW_STATUSES = ['pending', 'approved', 'rejected'];
const reviewLabels = { pending: 'На проверке', approved: 'Опубликован', rejected: 'Отклонён' };

const date = (value) => value ? new Date(value).toLocaleString('ru-RU') : '—';

const AdminPanel = () => {
  const [authenticated, setAuthenticated] = useState(null);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState({ newLeads: 0, activeOrders: 0, pendingReviews: 0, customers: 0 });
  const [orders, setOrders] = useState([]);
  const [leads, setLeads] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const api = async (url, options = {}) => {
    const response = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Ошибка запроса');
    return data;
  };

  const load = async () => {
    const [dashboard, orderData, leadData, reviewData, userData] = await Promise.all([
      api('/api/admin/dashboard'), api('/api/admin/orders'), api('/api/admin/leads'), api('/api/admin/reviews'), api('/api/admin/users'),
    ]);
    setStats(dashboard.stats); setOrders(orderData.orders); setLeads(leadData.leads); setReviews(reviewData.reviews); setUsers(userData.users);
  };

  // load is intentionally stable for this page; it is used only after the initial session check.
  useEffect(() => {
    api('/api/admin/session').then((data) => {
      setAuthenticated(Boolean(data.authenticated));
      if (data.authenticated) load().catch((loadError) => setError(loadError.message));
    }).catch((loadError) => { setAuthenticated(false); setError(loadError.message); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await api('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
      const session = await api('/api/admin/session');
      if (!session.authenticated) throw new Error('У этой учётной записи нет прав администратора');
      setAuthenticated(true); setCredentials({ username: '', password: '' }); await load();
    }
    catch (loginError) { setError(loginError.message); } finally { setBusy(false); }
  };

  const changeStatus = async (kind, id, status) => {
    setBusy(true); setError('');
    try {
      const data = await api(`/api/admin/${kind}/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      if (kind === 'orders') setOrders((items) => items.map((item) => item.id === id ? { ...item, ...data.order } : item));
      if (kind === 'leads') setLeads((items) => items.map((item) => item.id === id ? data.lead : item));
      if (kind === 'reviews') setReviews((items) => items.map((item) => item.id === id ? data.review : item));
      setStats((current) => ({ ...current, pendingReviews: kind === 'reviews' ? Math.max(0, current.pendingReviews + (status === 'pending' ? 1 : -1)) : current.pendingReviews }));
    } catch (statusError) { setError(statusError.message); } finally { setBusy(false); }
  };

  const logout = async () => { await api('/api/auth/logout', { method: 'POST', body: '{}' }).catch(() => {}); setAuthenticated(false); };

  if (authenticated === null) return <p className="admin-state">Проверяем вход…</p>;
  if (!authenticated) return (
    <section className="admin-login"><div className="admin-login__card">
      <p className="admin-kicker">01service</p><h1>Вход в админ-панель</h1><p className="admin-muted">Управление заказами, заявками и отзывами</p>
      {error && <p className="admin-error" role="alert">{error}</p>}
      <form onSubmit={login} className="admin-form">
        <label>Логин<input value={credentials.username} onChange={(event) => setCredentials({ ...credentials, username: event.target.value })} required /></label>
        <label>Пароль<input type="password" value={credentials.password} onChange={(event) => setCredentials({ ...credentials, password: event.target.value })} required /></label>
        <button className="btn btn--large" disabled={busy}>{busy ? 'Входим…' : 'Войти'}</button>
      </form>
    </div></section>
  );

  return <section className="admin-page">
    <header className="admin-page__header"><div><p className="admin-kicker">01service · администрирование</p><h1>Панель управления</h1><p className="admin-muted">Единая база сайта</p></div><div className="admin-actions"><button className="btn-outline" onClick={() => load().catch((loadError) => setError(loadError.message))}>Обновить</button><button className="btn" onClick={logout}>Выйти</button></div></header>
    {error && <p className="admin-error" role="alert">{error}</p>}
    <nav className="admin-tabs" aria-label="Разделы админ-панели">
      {[['overview', 'Обзор'], ['orders', `Заказы (${stats.activeOrders})`], ['leads', `Заявки (${stats.newLeads})`], ['reviews', `Отзывы (${stats.pendingReviews})`], ['users', `Клиенты (${stats.customers})`]].map(([id, label]) => <button key={id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}>{label}</button>)}
    </nav>
    {tab === 'overview' && <div className="admin-stat-grid">{[['Новые заявки', stats.newLeads], ['Активные заказы', stats.activeOrders], ['Отзывы на проверке', stats.pendingReviews], ['Клиенты', stats.customers]].map(([label, value]) => <div className="admin-stat" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>}
    {tab === 'orders' && <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Заказ</th><th>Клиент</th><th>Сумма</th><th>Дата</th><th>Статус</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><strong>#{order.id.slice(0, 8)}</strong><small>{order.items.map((item) => `${item.title} × ${item.quantity}`).join(', ')}</small></td><td>{order.contactName}<small>{order.email}<br />{order.phone}</small></td><td>${order.total.toLocaleString('en-US')}</td><td>{date(order.createdAt)}</td><td><select value={order.status} onChange={(event) => changeStatus('orders', order.id, event.target.value)} disabled={busy}>{ORDER_STATUSES.map((value) => <option key={value}>{value}</option>)}</select></td></tr>)}</tbody></table>{!orders.length && <div className="admin-empty">Заказов пока нет.</div>}</div>}
    {tab === 'leads' && <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Тип и дата</th><th>Контакт</th><th>Комментарий</th><th>Статус</th></tr></thead><tbody>{leads.map((lead) => <tr key={lead.id}><td><strong>{lead.type}</strong><small>{date(lead.createdAt)}</small></td><td>{lead.name}<small>{lead.phone}<br />{lead.email}</small></td><td>{lead.comments || lead.itemsSummary || '—'}</td><td><select value={lead.status} onChange={(event) => changeStatus('leads', lead.id, event.target.value)} disabled={busy}>{LEAD_STATUSES.map((value) => <option key={value}>{value}</option>)}</select></td></tr>)}</tbody></table>{!leads.length && <div className="admin-empty">Заявок пока нет.</div>}</div>}
    {tab === 'reviews' && <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Автор</th><th>Оценка</th><th>Текст</th><th>Дата</th><th>Публикация</th></tr></thead><tbody>{reviews.map((review) => <tr key={review.id}><td>{review.authorName}<small>Заказ #{review.orderId.slice(0, 8)}</small></td><td>{'★'.repeat(review.rating)}</td><td>{review.text}</td><td>{date(review.createdAt)}</td><td><select value={review.status} onChange={(event) => changeStatus('reviews', review.id, event.target.value)} disabled={busy}>{REVIEW_STATUSES.map((value) => <option key={value} value={value}>{reviewLabels[value]}</option>)}</select></td></tr>)}</tbody></table>{!reviews.length && <div className="admin-empty">Отзывов пока нет.</div>}</div>}
    {tab === 'users' && <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Клиент</th><th>Email</th><th>Телефон</th><th>Регистрация</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td>{[user.lastName, user.firstName].filter(Boolean).join(' ') || user.name}</td><td>{user.email}</td><td>{user.phone || '—'}</td><td>{date(user.createdAt)}</td></tr>)}</tbody></table>{!users.length && <div className="admin-empty">Клиентов пока нет.</div>}</div>}
  </section>;
};

export default AdminPanel;
