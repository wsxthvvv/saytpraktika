import { PENDING_LEADS_KEY, submitLead } from '../api/submitLead';

export async function flushPendingLeads() {
  let list;
  try {
    list = JSON.parse(localStorage.getItem(PENDING_LEADS_KEY) || '[]');
  } catch {
    return { flushed: 0, remaining: 0 };
  }
  if (!list.length) return { flushed: 0, remaining: 0 };

  const remaining = [];
  let flushed = 0;

  for (const item of list) {
    const { id, queuedAt, ...payload } = item;
    const result = await submitLead(payload, { queueOnFailure: false });
    if (result.delivered) {
      flushed += 1;
    } else {
      remaining.push(item);
    }
  }

  localStorage.setItem(PENDING_LEADS_KEY, JSON.stringify(remaining));
  return { flushed, remaining: remaining.length };
}
