const LEAD_NOTICE_KEY = '01service_lead_notice';

export function setLeadNotice(message) {
  if (!message) return;
  sessionStorage.setItem(LEAD_NOTICE_KEY, message);
}

export function consumeLeadNotice() {
  const message = sessionStorage.getItem(LEAD_NOTICE_KEY);
  sessionStorage.removeItem(LEAD_NOTICE_KEY);
  return message;
}
