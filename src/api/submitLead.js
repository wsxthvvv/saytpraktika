import { LEAD_API_URL } from '../constants/messengers';
import { LEGAL_OPERATOR } from '../constants/legalEntity';

export const PENDING_LEADS_KEY = '01service_pending_leads';

export function queueLeadLocally(payload) {
  try {
    const list = JSON.parse(localStorage.getItem(PENDING_LEADS_KEY) || '[]');
    list.push({
      ...payload,
      id: Date.now(),
      queuedAt: new Date().toISOString(),
    });
    localStorage.setItem(PENDING_LEADS_KEY, JSON.stringify(list.slice(-30)));
  } catch {
    // ignore quota errors in demo
  }
}

export function buildLeadMailto(payload) {
  const subject = encodeURIComponent(`Заявка ${LEGAL_OPERATOR.siteName}: ${payload.type || 'lead'}`);
  const lines = [
    `Тип: ${payload.type || '—'}`,
    `Имя: ${payload.name || '—'}`,
    `Телефон: ${payload.phone || '—'}`,
    `Email: ${payload.email || '—'}`,
    payload.address ? `Адрес: ${payload.address}` : null,
    payload.total != null ? `Сумма: ${payload.total}` : null,
    payload.itemsSummary ? `Состав: ${payload.itemsSummary}` : null,
    payload.comments ? `Комментарий: ${payload.comments}` : null,
    '',
    'Отправлено с сайта (API недоступен, заявка сохранена локально).',
  ].filter(Boolean);

  const body = encodeURIComponent(lines.join('\n'));
  return `mailto:${LEGAL_OPERATOR.email}?subject=${subject}&body=${body}`;
}

export const submitLead = async (payload, options = {}) => {
  const { queueOnFailure = true } = options;
  try {
    const response = await fetch(LEAD_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (queueOnFailure) queueLeadLocally(payload);
      return {
        ok: true,
        delivered: false,
        queued: queueOnFailure,
        mailto: buildLeadMailto(payload),
        error: data.error || `HTTP ${response.status}`,
      };
    }

    return { ok: true, delivered: true, queued: false, data };
  } catch (error) {
    if (queueOnFailure) queueLeadLocally(payload);
    return {
      ok: true,
      delivered: false,
      queued: queueOnFailure,
      mailto: buildLeadMailto(payload),
      error: error.message || 'network_error',
    };
  }
};
