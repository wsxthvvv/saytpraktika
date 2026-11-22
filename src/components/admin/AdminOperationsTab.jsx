import { useCallback, useEffect, useState } from 'react';
import AdminPagination from './AdminPagination';
import { adminApi, formatAdminDate } from '../../admin/helpers';

const emptySettings = {
  contacts: { telegramUrl: '', telegramBotUrl: '', maxUrl: '', email: '', phone: '' },
  delivery: { baseFee: 0, freeFrom: '', zones: [], intervals: [], note: 'Стоимость и сроки доставки подтверждаются менеджером.' },
};

const AdminOperationsTab = ({ type, onNotice }) => {
  const [settings, setSettings] = useState(emptySettings);
  const [notifications, setNotifications] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (type === 'settings') {
        const data = await adminApi('/api/admin/settings');
        setSettings({
          contacts: { ...emptySettings.contacts, ...data.settings.contacts },
          delivery: { ...emptySettings.delivery, ...data.settings.delivery },
        });
      } else {
        const params = new URLSearchParams({ page: String(page), limit: '20' });
        if (status !== 'all') params.set('status', status);
        const data = await adminApi(`/api/admin/notifications?${params}`);
        setNotifications(data.notifications || []);
        setPagination(data.pagination);
      }
      setError('');
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [type, page, status]);

  useEffect(() => { load(); }, [load]);

  const saveSettings = async (event) => {
    event.preventDefault();
    setBusyId('settings');
    setError('');
    try {
      const data = await adminApi('/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({ contacts: settings.contacts, delivery: settings.delivery }),
      });
      setSettings(data.settings);
      onNotice?.('Настройки сохранены');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusyId(null);
    }
  };

  const retry = async (notification) => {
    if (!window.confirm(`Повторить отправку уведомления #${notification.id}?`)) return;
    setBusyId(notification.id);
    try {
      await adminApi(`/api/admin/notifications/${notification.id}/retry`, { method: 'POST', body: '{}' });
      onNotice?.('Повторная отправка запущена');
      await load();
    } catch (retryError) {
      setError(retryError.message);
    } finally {
      setBusyId(null);
    }
  };

  const setContact = (field, value) => setSettings((previous) => ({
    ...previous, contacts: { ...previous.contacts, [field]: value },
  }));
  const setDelivery = (field, value) => setSettings((previous) => ({
    ...previous, delivery: { ...previous.delivery, [field]: value },
  }));
  const setZone = (index, field, value) => setDelivery('zones', settings.delivery.zones.map((zone, zoneIndex) => (
    zoneIndex === index ? { ...zone, [field]: field === 'fee' ? Number(value) : value } : zone
  )));

  if (type === 'settings') return (
    <form className="admin-panel-block admin-settings" onSubmit={saveSettings}>
      <h2>Контакты и доставка</h2>
      {error && <p className="admin-error" role="alert">{error}</p>}
      <fieldset className="admin-settings__fieldset">
        <legend>Контакты владельца</legend>
        <label>Ссылка Telegram<input type="url" value={settings.contacts.telegramUrl} onChange={(event) => setContact('telegramUrl', event.target.value)} placeholder="https://t.me/..." /></label>
        <label>Ссылка Telegram-бота<input type="url" value={settings.contacts.telegramBotUrl} onChange={(event) => setContact('telegramBotUrl', event.target.value)} placeholder="https://t.me/имя_бота" /></label>
        <label>Ссылка MAX<input type="url" value={settings.contacts.maxUrl} onChange={(event) => setContact('maxUrl', event.target.value)} placeholder="https://max.ru/..." /></label>
        <label>Email<input type="email" value={settings.contacts.email} onChange={(event) => setContact('email', event.target.value)} /></label>
        <label>Телефон<input type="tel" value={settings.contacts.phone} onChange={(event) => setContact('phone', event.target.value)} /></label>
      </fieldset>
      <fieldset className="admin-settings__fieldset">
        <legend>Условия доставки (USD)</legend>
        <label>Базовая стоимость<input type="number" min="0" step="0.01" value={settings.delivery.baseFee ?? 0} onChange={(event) => setDelivery('baseFee', Number(event.target.value))} /></label>
        <label>Бесплатно от<input type="number" min="0" step="0.01" value={settings.delivery.freeFrom ?? ''} onChange={(event) => setDelivery('freeFrom', event.target.value === '' ? null : Number(event.target.value))} placeholder="Не задано" /></label>
        <label className="admin-settings__wide">Интервалы доставки, по одному на строку<textarea rows={3} value={(settings.delivery.intervals || []).join('\n')} onChange={(event) => setDelivery('intervals', event.target.value.split(/\r?\n/).map((interval) => interval.trim()).filter(Boolean))} placeholder="Например: 10:00-14:00" /></label>
        <label className="admin-settings__wide">Примечание<textarea rows={2} value={settings.delivery.note || ''} onChange={(event) => setDelivery('note', event.target.value)} /></label>
        <div className="admin-settings__zones admin-settings__wide">
          <strong>Зоны доставки</strong>
          {settings.delivery.zones.map((zone, index) => (
            <div className="admin-settings__zone" key={`${zone.name}-${index}`}>
              <label>Название<input value={zone.name || ''} onChange={(event) => setZone(index, 'name', event.target.value)} /></label>
              <label>Стоимость<input type="number" min="0" step="0.01" value={zone.fee ?? 0} onChange={(event) => setZone(index, 'fee', event.target.value)} /></label>
              <label className="admin-settings__wide">Города через запятую<input value={(zone.cities || []).join(', ')} onChange={(event) => setZone(index, 'cities', event.target.value.split(',').map((city) => city.trim()).filter(Boolean))} placeholder="Москва, Химки" /></label>
              <button type="button" className="btn-outline" onClick={() => setDelivery('zones', settings.delivery.zones.filter((_, zoneIndex) => zoneIndex !== index))}>Удалить зону</button>
            </div>
          ))}
          <button type="button" className="btn-outline" onClick={() => setDelivery('zones', [...settings.delivery.zones, { name: '', fee: 0, cities: [] }])}>Добавить зону</button>
        </div>
      </fieldset>
      <button className="btn" disabled={loading || busyId === 'settings'}>{busyId === 'settings' ? 'Сохраняем…' : 'Сохранить настройки'}</button>
    </form>
  );

  const notificationStatuses = { pending: 'Ожидает отправки', sending: 'Отправляется', sent: 'Отправлено', failed: 'Ошибка' };
  return (
    <div className="admin-panel-block admin-panel-block--flush">
      <div className="admin-page__header">
        <div><h2>Уведомления</h2><p className="admin-muted">Состояние отправки заявок и заказов владельцу</p></div>
        <select className="admin-toolbar__select" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
          <option value="all">Все состояния</option>
          {Object.entries(notificationStatuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </div>
      {error && <p className="admin-error" role="alert">{error}</p>}
      {loading && <p className="admin-muted">Загрузка…</p>}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Дата</th><th>Тип</th><th>Обращение</th><th>Статус</th><th>Попытки</th><th>Ошибка</th><th /></tr></thead>
          <tbody>{notifications.map((item) => (
            <tr key={item.id}>
              <td>{formatAdminDate(item.created_at)}</td>
              <td>{item.entity_type === 'order' ? 'Заказ' : 'Заявка'}</td>
              <td>{item.entity_id}</td>
              <td>{notificationStatuses[item.status] || item.status}</td>
              <td>{item.attempts}</td>
              <td>{item.last_error || '—'}</td>
              <td>{item.status === 'failed' && <button type="button" className="btn-outline" disabled={busyId === item.id} onClick={() => retry(item)}>{busyId === item.id ? 'Запуск…' : 'Повторить'}</button>}</td>
            </tr>
          ))}</tbody>
        </table>
        {!notifications.length && !loading && <div className="admin-empty">Уведомлений не найдено.</div>}
      </div>
      <AdminPagination pagination={pagination} onPageChange={setPage} disabled={loading} />
    </div>
  );
};

export default AdminOperationsTab;
