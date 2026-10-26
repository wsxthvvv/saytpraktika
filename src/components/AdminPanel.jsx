import { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import AdminPagination from './admin/AdminPagination';
import AdminCatalogTab from './admin/AdminCatalogTab';
import AdminAuditTab from './admin/AdminAuditTab';
import {
  ORDER_STATUSES,
  LEAD_STATUSES,
  REVIEW_STATUSES,
  reviewLabels,
  formatAdminDate,
  leadTypeLabel,
  formatOrderTotal,
  downloadCsv,
  adminApi,
  syncAdminSessionToProfile,
  buildAdminListUrl,
  LEAD_STATUS_OPTIONS,
  ORDER_STATUS_OPTIONS,
} from '../admin/helpers';

const SITE_NAV = [
  { to: '/', label: 'Главная' },
  { to: '/services', label: 'Услуги' },
  { to: '/products', label: 'Продукты' },
  { to: '/mining', label: 'Майнинг' },
  { to: '/news', label: 'Новости' },
];

const TABS = [
  { id: 'overview', label: 'Обзор' },
  { id: 'leads', label: 'Заявки', statKey: 'newLeads' },
  { id: 'orders', label: 'Заказы', statKey: 'activeOrders' },
  { id: 'reviews', label: 'Отзывы', statKey: 'pendingReviews' },
  { id: 'users', label: 'Клиенты', statKey: 'customers' },
  { id: 'catalog', label: 'Каталог' },
  { id: 'audit', label: 'Журнал' },
];

const PAGE_SIZE = 20;

const AdminToolbar = ({
  search,
  onSearch,
  statusFilter,
  onStatusFilter,
  statusOptions,
  typeFilter,
  onTypeFilter,
  onExport,
  exportLabel,
  summary,
}) => (
  <div className="admin-toolbar">
    <div className="admin-toolbar__row">
      <input
        type="search"
        className="admin-toolbar__search"
        placeholder="Поиск: имя, телефон, email, номер…"
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        aria-label="Поиск"
      />
      {statusOptions?.length > 0 && (
        <select
          className="admin-toolbar__select"
          value={statusFilter}
          onChange={(event) => onStatusFilter(event.target.value)}
          aria-label="Фильтр по статусу"
        >
          <option value="all">Все статусы</option>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      )}
      {onTypeFilter && (
        <select
          className="admin-toolbar__select"
          value={typeFilter}
          onChange={(event) => onTypeFilter(event.target.value)}
          aria-label="Фильтр по типу"
        >
          <option value="all">Все типы</option>
          <option value="service">Услуги</option>
          <option value="callback">Обратный звонок</option>
          <option value="order">Заказы с сайта</option>
        </select>
      )}
      {onExport && (
        <button type="button" className="btn-outline admin-toolbar__export" onClick={onExport}>
          {exportLabel}
        </button>
      )}
    </div>
    {summary && <p className="admin-summary">{summary}</p>}
  </div>
);

const OrderDetailModal = ({ order, onClose }) => {
  if (!order) return null;
  return (
    <div className="admin-modal-overlay" onClick={onClose} role="presentation">
      <div className="admin-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-labelledby="admin-order-title">
        <header className="admin-modal__header">
          <div>
            <h2 id="admin-order-title">Заказ #{order.id.slice(0, 8)}</h2>
            <p className="admin-muted">{formatAdminDate(order.createdAt)} · {order.status}</p>
          </div>
          <button type="button" className="admin-modal__close" onClick={onClose} aria-label="Закрыть">✕</button>
        </header>
        <div className="admin-modal__body">
          <div className="admin-detail-grid">
            <div><span>Клиент</span><strong>{order.contactName}</strong></div>
            <div><span>Телефон</span><strong>{order.phone || '—'}</strong></div>
            <div><span>Email</span><strong>{order.email || '—'}</strong></div>
            <div><span>Сумма</span><strong>{formatOrderTotal(order)}</strong></div>
            <div className="admin-detail-grid__wide"><span>Адрес доставки</span><strong>{order.address || '—'}</strong></div>
            <div><span>Дата доставки</span><strong>{order.deliveryDate || '—'}</strong></div>
            <div><span>Время</span><strong>{order.deliveryTime || '—'}</strong></div>
          </div>
          {order.comments && <p className="admin-modal__comment"><strong>Комментарий:</strong> {order.comments}</p>}
          <h3 className="admin-modal__subtitle">Состав заказа</h3>
          <ul className="admin-order-items">
            {order.items.map((item) => (
              <li key={`${item.id}-${item.title}`}>
                <span>{item.title} × {item.quantity}</span>
                <span>{formatOrderTotal({ total: Number(item.price) * Number(item.quantity), currency: order.currency })}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

const AdminPanel = () => {
  const [authenticated, setAuthenticated] = useState(null);
  const [adminUser, setAdminUser] = useState(null);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState({ newLeads: 0, activeOrders: 0, pendingReviews: 0, customers: 0 });
  const [orders, setOrders] = useState([]);
  const [leads, setLeads] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [updatingKey, setUpdatingKey] = useState(null);
  const [search, setSearch] = useState('');
  const [leadStatusFilter, setLeadStatusFilter] = useState('all');
  const [leadTypeFilter, setLeadTypeFilter] = useState('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [reviewStatusFilter, setReviewStatusFilter] = useState('pending');
  const [orderDetail, setOrderDetail] = useState(null);
  const [leadsPage, setLeadsPage] = useState(1);
  const [ordersPage, setOrdersPage] = useState(1);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [usersPage, setUsersPage] = useState(1);
  const [leadsPagination, setLeadsPagination] = useState(null);
  const [ordersPagination, setOrdersPagination] = useState(null);
  const [reviewsPagination, setReviewsPagination] = useState(null);
  const [usersPagination, setUsersPagination] = useState(null);
  const [searchDebounced, setSearchDebounced] = useState('');

  const showNotice = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3500);
  };

  const loadStats = useCallback(async () => {
    const dashboard = await adminApi('/api/admin/dashboard');
    setStats(dashboard.stats);
  }, []);

  const loadTabData = useCallback(async () => {
    if (!authenticated) return;
    setLoading(true);
    try {
      await loadStats();
      if (tab === 'overview') {
        const leadData = await adminApi(buildAdminListUrl('/api/admin/leads', { page: 1, limit: 6 }));
        setLeads(leadData.leads);
      }
      if (tab === 'leads') {
        const leadData = await adminApi(buildAdminListUrl('/api/admin/leads', {
          page: leadsPage, limit: PAGE_SIZE, q: searchDebounced, status: leadStatusFilter, type: leadTypeFilter,
        }));
        setLeads(leadData.leads);
        setLeadsPagination(leadData.pagination);
      }
      if (tab === 'orders') {
        const orderData = await adminApi(buildAdminListUrl('/api/admin/orders', {
          page: ordersPage, limit: PAGE_SIZE, q: searchDebounced, status: orderStatusFilter,
        }));
        setOrders(orderData.orders);
        setOrdersPagination(orderData.pagination);
      }
      if (tab === 'reviews') {
        const reviewData = await adminApi(buildAdminListUrl('/api/admin/reviews', {
          page: reviewsPage, limit: PAGE_SIZE, q: searchDebounced, status: reviewStatusFilter,
        }));
        setReviews(reviewData.reviews);
        setReviewsPagination(reviewData.pagination);
      }
      if (tab === 'users') {
        const userData = await adminApi(buildAdminListUrl('/api/admin/users', {
          page: usersPage, limit: PAGE_SIZE, q: searchDebounced,
        }));
        setUsers(userData.users);
        setUsersPagination(userData.pagination);
      }
      setError('');
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [
    authenticated, tab, leadsPage, ordersPage, reviewsPage, usersPage, searchDebounced,
    leadStatusFilter, leadTypeFilter, orderStatusFilter, reviewStatusFilter, loadStats,
  ]);

  useEffect(() => {
    adminApi('/api/admin/session')
      .then((data) => {
        setAuthenticated(Boolean(data.authenticated));
        setAdminUser(data.user || null);
      })
      .catch((loadError) => {
        setAuthenticated(false);
        setError(loadError.message);
      });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchDebounced(search), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (authenticated) loadTabData();
  }, [authenticated, loadTabData]);

  const login = async (event) => {
    event.preventDefault();
    setUpdatingKey('login');
    setError('');
    try {
      const loginResult = await adminApi('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      const session = await adminApi('/api/admin/session');
      if (!session.authenticated) throw new Error('У этой учётной записи нет прав администратора');
      setAuthenticated(true);
      setAdminUser(session.user || loginResult.user);
      syncAdminSessionToProfile(session.user || loginResult.user);
      setCredentials({ username: '', password: '' });
      showNotice('Вы вошли в панель управления');
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setUpdatingKey(null);
    }
  };

  const logout = async () => {
    await adminApi('/api/auth/logout', { method: 'POST', body: '{}' }).catch(() => {});
    localStorage.removeItem('currentUser');
    window.dispatchEvent(new Event('userUpdated'));
    setAuthenticated(false);
    setAdminUser(null);
  };

  const changeStatus = async (kind, id, status) => {
    setUpdatingKey(`${kind}-${id}`);
    setError('');
    try {
      const data = await adminApi(`/api/admin/${kind}/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (kind === 'orders') {
        setOrders((items) => items.map((item) => (item.id === id ? { ...item, ...data.order } : item)));
      }
      if (kind === 'leads') {
        setLeads((items) => items.map((item) => (item.id === id ? data.lead : item)));
      }
      if (kind === 'reviews') {
        setReviews((items) => items.map((item) => (item.id === id ? data.review : item)));
      }
      await loadStats();
      await loadTabData();
      showNotice('Статус обновлён');
    } catch (statusError) {
      setError(statusError.message);
    } finally {
      setUpdatingKey(null);
    }
  };

  const exportLeads = async () => {
    const data = await adminApi(buildAdminListUrl('/api/admin/leads', {
      page: 1, limit: 5000, q: searchDebounced, status: leadStatusFilter, type: leadTypeFilter,
    }));
    downloadCsv('leads.csv', data.leads, [
      { label: 'Дата', value: (row) => formatAdminDate(row.createdAt) },
      { label: 'Тип', value: (row) => leadTypeLabel(row.type) },
      { label: 'Статус', value: (row) => row.status },
      { label: 'Имя', value: (row) => row.name },
      { label: 'Телефон', value: (row) => row.phone },
      { label: 'Email', value: (row) => row.email },
      { label: 'Комментарий', value: (row) => row.comments || row.itemsSummary || '' },
    ]);
  };

  const exportOrders = async () => {
    const data = await adminApi(buildAdminListUrl('/api/admin/orders', {
      page: 1, limit: 5000, q: searchDebounced, status: orderStatusFilter,
    }));
    downloadCsv('orders.csv', data.orders, [
      { label: 'ID', value: (row) => row.id },
      { label: 'Дата', value: (row) => formatAdminDate(row.createdAt) },
      { label: 'Статус', value: (row) => row.status },
      { label: 'Клиент', value: (row) => row.contactName },
      { label: 'Телефон', value: (row) => row.phone },
      { label: 'Email', value: (row) => row.email },
      { label: 'Сумма', value: (row) => row.total },
      { label: 'Адрес', value: (row) => row.address },
    ]);
  };

  if (authenticated === null) {
    return <p className="admin-state">Проверяем вход…</p>;
  }

  if (!authenticated) {
    return (
      <>
        <Helmet>
          <title>Вход · админ-панель 01service</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <section className="admin-login">
          <div className="admin-login__card">
            <p className="admin-kicker">01service</p>
            <h1>Вход в админ-панель</h1>
            <p className="admin-muted">Заказы, заявки, отзывы и клиенты — единая база сайта</p>
            {error && <p className="admin-error" role="alert">{error}</p>}
            <form onSubmit={login} className="admin-form">
              <label>
                Логин или email
                <input
                  value={credentials.username}
                  onChange={(event) => setCredentials({ ...credentials, username: event.target.value })}
                  autoComplete="username"
                  required
                />
              </label>
              <label>
                Пароль
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(event) => setCredentials({ ...credentials, password: event.target.value })}
                  autoComplete="current-password"
                  required
                />
              </label>
              <button className="btn btn--large" disabled={updatingKey === 'login'}>
                {updatingKey === 'login' ? 'Входим…' : 'Войти'}
              </button>
            </form>
            <p className="admin-login__hint">
              <Link to="/">← На главную сайта</Link>
            </p>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Панель управления · 01service</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="admin-layout">
        <aside className="admin-sidebar" aria-label="Навигация админ-панели">
          <p className="admin-kicker">01service</p>
          <p className="admin-sidebar__title">Управление</p>
          <div className="admin-sidebar__site-nav" aria-label="Сайт">
            {SITE_NAV.map(({ to, label }) => (
              <Link key={to} to={to} className="admin-sidebar__site-link">{label}</Link>
            ))}
          </div>
          <p className="admin-sidebar__section-label">Разделы панели</p>
          <nav className="admin-sidebar__nav">
            {TABS.map(({ id, label, statKey }) => (
              <button
                key={id}
                type="button"
                className={tab === id ? 'is-active' : ''}
                onClick={() => setTab(id)}
              >
                <span>{label}</span>
                {statKey && stats[statKey] > 0 && id !== 'overview' && (
                  <em className="admin-sidebar__badge">{stats[statKey]}</em>
                )}
              </button>
            ))}
          </nav>
          <div className="admin-sidebar__footer">
            <p className="admin-sidebar__user">{adminUser?.email || adminUser?.username}</p>
            <Link to="/" className="admin-sidebar__link">На сайт</Link>
          </div>
        </aside>

        <section className="admin-page">
          <header className="admin-page__header">
            <div>
              <nav className="admin-breadcrumb" aria-label="Навигация">
                <button type="button" className="admin-breadcrumb__link" onClick={() => setTab('overview')}>Панель</button>
                <span aria-hidden="true">/</span>
                <span>{TABS.find((item) => item.id === tab)?.label || 'Панель'}</span>
              </nav>
              <h1>{TABS.find((item) => item.id === tab)?.label || 'Панель'}</h1>
              <p className="admin-muted">Режим менеджера: заказы и заявки клиентов, не личные покупки.</p>
            </div>
            <div className="admin-actions">
              <Link to="/" className="btn-outline">На сайт</Link>
              <button
                type="button"
                className="btn-outline"
                onClick={() => loadTabData().then(() => showNotice('Данные обновлены'))}
                disabled={loading}
              >
                {loading ? 'Загрузка…' : 'Обновить'}
              </button>
              <button type="button" className="btn" onClick={logout}>Выйти</button>
            </div>
          </header>

          {notice && <p className="admin-notice" role="status">{notice}</p>}
          {error && <p className="admin-error" role="alert">{error}</p>}

          {tab === 'overview' && (
            <div className="admin-overview">
              <div className="admin-stat-grid">
                {[
                  ['newLeads', 'Новые заявки', 'leads'],
                  ['activeOrders', 'Активные заказы', 'orders'],
                  ['pendingReviews', 'Отзывы на проверке', 'reviews'],
                  ['customers', 'Клиенты', 'users'],
                ].map(([key, label, targetTab]) => (
                  <button
                    key={key}
                    type="button"
                    className="admin-stat admin-stat--action"
                    onClick={() => setTab(targetTab)}
                  >
                    <span>{label}</span>
                    <strong>{stats[key]}</strong>
                    <span className="admin-stat__link">Открыть раздел →</span>
                  </button>
                ))}
              </div>
              <div className="admin-panel-block">
                <h2>Последние заявки</h2>
                {!leads.length && <div className="admin-empty">Заявок пока нет.</div>}
                <div className="admin-leads">
                  {leads.map((lead) => (
                    <article className="admin-lead" key={lead.id}>
                      <div className="admin-lead__top">
                        <div>
                          <strong>{leadTypeLabel(lead.type)}</strong>
                          <span className="admin-lead__date">{formatAdminDate(lead.createdAt)}</span>
                        </div>
                        <select
                          value={lead.status}
                          onChange={(event) => changeStatus('leads', lead.id, event.target.value)}
                          disabled={updatingKey === `leads-${lead.id}`}
                        >
                          {LEAD_STATUSES.map((value) => <option key={value}>{value}</option>)}
                        </select>
                      </div>
                      <div className="admin-lead__grid">
                        <div><span>Имя</span><strong>{lead.name}</strong></div>
                        <div><span>Телефон</span><strong>{lead.phone}</strong></div>
                        <div><span>Email</span><strong>{lead.email || '—'}</strong></div>
                        <div><span>Статус</span><strong>{lead.status}</strong></div>
                      </div>
                      {(lead.comments || lead.itemsSummary) && (
                        <p>{lead.comments || lead.itemsSummary}</p>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'leads' && (
            <>
              <AdminToolbar
                search={search}
                onSearch={setSearch}
                statusFilter={leadStatusFilter}
                onStatusFilter={(value) => { setLeadStatusFilter(value); setLeadsPage(1); }}
                statusOptions={LEAD_STATUS_OPTIONS.slice(1)}
                typeFilter={leadTypeFilter}
                onTypeFilter={(value) => { setLeadTypeFilter(value); setLeadsPage(1); }}
                onExport={() => exportLeads().catch((exportError) => setError(exportError.message))}
                exportLabel="CSV заявок"
                summary={leadsPagination ? `Страница ${leadsPagination.page} из ${leadsPagination.totalPages} · всего ${leadsPagination.total}` : ''}
              />
              {!leads.length && !loading && <div className="admin-empty">Нет заявок по выбранным фильтрам.</div>}
              <div className="admin-leads">
                {leads.map((lead) => (
                  <article className="admin-lead" key={lead.id}>
                    <div className="admin-lead__top">
                      <div>
                        <strong>{leadTypeLabel(lead.type)}</strong>
                        <span className="admin-lead__date">#{lead.id.slice(0, 8)} · {formatAdminDate(lead.createdAt)}</span>
                      </div>
                      <select
                        value={lead.status}
                        onChange={(event) => changeStatus('leads', lead.id, event.target.value)}
                        disabled={updatingKey === `leads-${lead.id}`}
                      >
                        {LEAD_STATUSES.map((value) => <option key={value}>{value}</option>)}
                      </select>
                    </div>
                    <div className="admin-lead__grid">
                      <div><span>Имя</span><strong>{lead.name}</strong></div>
                      <div><span>Телефон</span><strong>{lead.phone}</strong></div>
                      <div><span>Email</span><strong>{lead.email || '—'}</strong></div>
                      <div><span>Адрес</span><strong>{lead.address || '—'}</strong></div>
                    </div>
                    {(lead.comments || lead.itemsSummary) && (
                      <p><strong>Текст:</strong> {lead.comments || lead.itemsSummary}</p>
                    )}
                  </article>
                ))}
              </div>
              <AdminPagination pagination={leadsPagination} onPageChange={setLeadsPage} disabled={loading} />
            </>
          )}

          {tab === 'orders' && (
            <>
              <AdminToolbar
                search={search}
                onSearch={setSearch}
                statusFilter={orderStatusFilter}
                onStatusFilter={(value) => { setOrderStatusFilter(value); setOrdersPage(1); }}
                statusOptions={ORDER_STATUS_OPTIONS.slice(1)}
                onExport={() => exportOrders().catch((exportError) => setError(exportError.message))}
                exportLabel="CSV заказов"
                summary={ordersPagination ? `Страница ${ordersPagination.page} из ${ordersPagination.totalPages} · всего ${ordersPagination.total}` : ''}
              />
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Заказ</th>
                      <th>Клиент</th>
                      <th>Сумма</th>
                      <th>Дата</th>
                      <th>Статус</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <strong>#{order.id.slice(0, 8)}</strong>
                          <small>{order.items.map((item) => `${item.title} × ${item.quantity}`).join(', ')}</small>
                        </td>
                        <td>
                          {order.contactName}
                          <small>{order.email}<br />{order.phone}</small>
                        </td>
                        <td>{formatOrderTotal(order)}</td>
                        <td>{formatAdminDate(order.createdAt)}</td>
                        <td>
                          <select
                            value={order.status}
                            onChange={(event) => changeStatus('orders', order.id, event.target.value)}
                            disabled={updatingKey === `orders-${order.id}`}
                          >
                            {ORDER_STATUSES.map((value) => <option key={value}>{value}</option>)}
                          </select>
                        </td>
                        <td>
                          <button type="button" className="btn-outline admin-table__detail" onClick={() => setOrderDetail(order)}>
                            Подробнее
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!orders.length && !loading && <div className="admin-empty">Заказов не найдено.</div>}
              </div>
              <AdminPagination pagination={ordersPagination} onPageChange={setOrdersPage} disabled={loading} />
            </>
          )}

          {tab === 'reviews' && (
            <>
              <AdminToolbar
                search={search}
                onSearch={setSearch}
                statusFilter={reviewStatusFilter}
                onStatusFilter={(value) => { setReviewStatusFilter(value); setReviewsPage(1); }}
                statusOptions={REVIEW_STATUSES.map((value) => ({ value, label: reviewLabels[value] }))}
                summary={reviewsPagination ? `Страница ${reviewsPagination.page} из ${reviewsPagination.totalPages} · всего ${reviewsPagination.total}` : ''}
              />
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Автор</th>
                      <th>Товар</th>
                      <th>Оценка</th>
                      <th>Текст</th>
                      <th>Дата</th>
                      <th>Публикация</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviews.map((review) => (
                      <tr key={review.id}>
                        <td>
                          {review.authorName}
                          <small>Заказ #{review.orderId.slice(0, 8)}</small>
                        </td>
                        <td>{review.productTitle || '—'}</td>
                        <td>{'★'.repeat(review.rating)}</td>
                        <td>{review.text}</td>
                        <td>{formatAdminDate(review.createdAt)}</td>
                        <td>
                          <select
                            value={review.status}
                            onChange={(event) => changeStatus('reviews', review.id, event.target.value)}
                            disabled={updatingKey === `reviews-${review.id}`}
                          >
                            {REVIEW_STATUSES.map((value) => (
                              <option key={value} value={value}>{reviewLabels[value]}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!reviews.length && !loading && <div className="admin-empty">Отзывов не найдено.</div>}
              </div>
              <AdminPagination pagination={reviewsPagination} onPageChange={setReviewsPage} disabled={loading} />
            </>
          )}

          {tab === 'users' && (
            <>
              <AdminToolbar
                search={search}
                onSearch={setSearch}
                summary={usersPagination ? `Страница ${usersPagination.page} из ${usersPagination.totalPages} · всего ${usersPagination.total} клиентов` : ''}
              />
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Клиент</th>
                      <th>Email</th>
                      <th>Телефон</th>
                      <th>Регистрация</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td>{[user.lastName, user.firstName].filter(Boolean).join(' ') || user.name}</td>
                        <td>{user.email}</td>
                        <td>{user.phone || '—'}</td>
                        <td>{formatAdminDate(user.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!users.length && !loading && <div className="admin-empty">Клиентов не найдено.</div>}
              </div>
              <AdminPagination pagination={usersPagination} onPageChange={setUsersPage} disabled={loading} />
            </>
          )}

          {tab === 'catalog' && <AdminCatalogTab onNotice={showNotice} />}
          {tab === 'audit' && <AdminAuditTab />}
        </section>
      </div>
      <OrderDetailModal order={orderDetail} onClose={() => setOrderDetail(null)} />
    </>
  );
};

export default AdminPanel;
