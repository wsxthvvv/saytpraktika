const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const formatLeadMessage = (payload) => {
  const isOrder = payload.type === 'order';
  const lines = [
    isOrder
      ? `<b>Новый заказ №${escapeHtml(payload.orderNumber || '')} с сайта 01service</b>`
      : `<b>Новая заявка №${escapeHtml(payload.leadNumber || '')} ${payload.source === 'telegram' ? 'из Telegram' : 'с сайта 01service'}</b>`,
  ];

  if (payload.name) lines.push(`Имя: ${escapeHtml(payload.name)}`);
  if (!isOrder && payload.topic) lines.push(`Тема: ${escapeHtml(payload.topic)}`);
  if (!isOrder && payload.metadata?.serviceId) {
    lines.push(`Услуга ID: ${escapeHtml(String(payload.metadata.serviceId))}`);
    if (payload.metadata.serviceCategory) lines.push(`Категория: ${escapeHtml(payload.metadata.serviceCategory)}`);
  }
  if (payload.phone) lines.push(`Телефон: ${escapeHtml(payload.phone)}`);
  if (payload.email) lines.push(`Email: ${escapeHtml(payload.email)}`);
  if (payload.address) lines.push(`Адрес: ${escapeHtml(payload.address)}`);
  if (payload.deliveryDate) lines.push(`Дата доставки: ${escapeHtml(payload.deliveryDate)}`);
  if (payload.deliveryTime) lines.push(`Время: ${escapeHtml(payload.deliveryTime)}`);
  if (payload.comments) lines.push(`Комментарий: ${escapeHtml(payload.comments)}`);
  if (payload.total != null) {
    const total = Number(payload.total);
    const formattedTotal = Number.isFinite(total)
      ? `$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
      : escapeHtml(String(payload.total));
    lines.push(`${isOrder ? 'Итого' : 'Сумма'}: ${formattedTotal}`);
  }
  if (isOrder && payload.shippingFee != null) {
    const shippingFee = Number(payload.shippingFee);
    if (Number.isFinite(shippingFee)) {
      lines.push(`Доставка: $${shippingFee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`);
    }
  }
  if (payload.itemsSummary) lines.push(`Состав: ${escapeHtml(payload.itemsSummary)}`);

  lines.push(`Время: ${escapeHtml(new Date().toISOString())}`);
  return lines.join('\n');
};

const sendTelegram = async (text) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return { channel: 'telegram', ok: false, skipped: true, reason: 'missing_env' };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      signal: AbortSignal.timeout(8000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const data = await response.json().catch(() => ({}));
    return {
      channel: 'telegram',
      ok: response.ok && data.ok,
      status: response.status,
      error: data.description,
    };
  } catch (error) {
    return { channel: 'telegram', ok: false, error: error?.name === 'TimeoutError' ? 'timeout' : 'request_failed' };
  }
};

const sendMaxWebhook = async (payload, text) => {
  const webhookUrl = process.env.MAX_WEBHOOK_URL;
  const apiToken = process.env.MAX_API_TOKEN;

  if (!webhookUrl) {
    return { channel: 'max', ok: false, skipped: true, reason: 'missing_env' };
  }

  const headers = { 'Content-Type': 'application/json' };
  if (apiToken) headers.Authorization = `Bearer ${apiToken}`;

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      signal: AbortSignal.timeout(8000),
      headers,
      body: JSON.stringify({
        source: '01service',
        text,
        payload,
      }),
    });

    return {
      channel: 'max',
      ok: response.ok,
      status: response.status,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (error) {
    return { channel: 'max', ok: false, error: error?.name === 'TimeoutError' ? 'timeout' : 'request_failed' };
  }
};

const notifyLead = async (payload) => {
  const text = formatLeadMessage(payload);
  const [telegram, max] = await Promise.all([
    sendTelegram(text),
    sendMaxWebhook(payload, text.replace(/<[^>]+>/g, '')),
  ]);

  const delivered = [telegram, max].some((r) => r.ok);
  const allSkipped = [telegram, max].every((r) => r.skipped);

  return {
    ok: delivered || allSkipped,
    delivered,
    allSkipped,
    channels: { telegram, max },
  };
};

module.exports = { notifyLead, formatLeadMessage };
