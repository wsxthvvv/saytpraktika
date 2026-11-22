import { LEAD_API_URL } from '../constants/messengers';

export const submitLead = async (payload) => {
  try {
    const response = await fetch(LEAD_API_URL, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, delivered: false, stored: false, error: data.error || `HTTP ${response.status}` };
    }
    return {
      ok: Boolean(data.stored),
      delivered: Boolean(data.delivered),
      stored: Boolean(data.stored),
      leadId: data.leadId,
      leadNumber: data.leadNumber,
      notificationStatus: data.notificationStatus,
    };
  } catch (error) {
    return { ok: false, delivered: false, stored: false, error: error.message || 'network_error' };
  }
};
