const { listTelegramServices, getOfferById } = require('./servicesCatalog');

const services = listTelegramServices();
const serviceById = new Map(services.map((service) => [String(service.id), service]));

const clip = (value, max = 2000) => String(value ?? '').trim().slice(0, max);
const phonePattern = /^\+?[\d\s().-]{7,32}$/;

const telegramApi = async (token, method, body = {}) => {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    signal: AbortSignal.timeout(30_000),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(`Telegram ${method} failed (${response.status})`);
  return data.result;
};

const startTelegramBot = ({ pool, query, createLead, processNotificationOutbox }) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const enabled = String(process.env.TELEGRAM_BOT_ENABLED || '').toLowerCase() === 'true';
  if (!enabled || !token) return { stop: () => {} };

  const publicSiteUrl = String(process.env.PUBLIC_SITE_URL || 'https://01-service.ru').replace(/\/$/, '');
  let stopped = false;
  let timer;
  let cleanupTimer;
  let lockClient;

  const saveChat = async (chatId, state, data, dbQuery = query) => {
    await dbQuery(`INSERT INTO telegram_bot_chats(chat_id,state,data,updated_at) VALUES ($1,$2,$3,NOW())
      ON CONFLICT (chat_id) DO UPDATE SET state=EXCLUDED.state,data=EXCLUDED.data,updated_at=NOW()`,
    [chatId, state, JSON.stringify(data || {})]);
  };
  const getChat = async (chatId) => {
    const result = await query('SELECT state,data FROM telegram_bot_chats WHERE chat_id=$1', [chatId]);
    return result.rows[0] || { state: 'idle', data: {} };
  };
  const send = (chatId, text, extra = {}) => telegramApi(token, 'sendMessage', {
    chat_id: chatId, text, disable_web_page_preview: true, ...extra,
  });
  const keyboard = (rows) => ({ inline_keyboard: rows });
  const serviceKeyboard = () => keyboard(services.map((service) => ([{
    text: service.title.slice(0, 60), callback_data: `service:${service.id}`,
  }])));
  const showCatalog = async (chatId, prefix = '') => send(chatId,
    `${prefix ? `${prefix}\n\n` : ''}Выберите услугу. Стоимость и состав работ менеджер согласует после описания задачи.\n\nМайнеры продаются на сайте: ${publicSiteUrl}/products`,
  { reply_markup: serviceKeyboard() });
  const consentKeyboard = (serviceId) => keyboard([
    [{ text: 'Согласен и продолжить', callback_data: `consent_yes:${serviceId}` }],
    [{ text: 'Отмена', callback_data: 'consent_no' }],
    [{ text: 'Политика конфиденциальности', url: `${publicSiteUrl}/privacy` }],
    [{ text: 'Согласие на обработку ПДн', url: `${publicSiteUrl}/consent` }],
  ]);
  const askConsent = async (chatId, service) => {
    await saveChat(chatId, 'awaiting_consent', { serviceId: service.id });
    return send(chatId, `Вы выбрали: ${service.shortTitle || service.title}.\n\nПеред заявкой ознакомьтесь с документами и подтвердите согласие на обработку персональных данных.`, {
      reply_markup: consentKeyboard(service.id),
    });
  };

  const handleCallback = async (callback) => {
    const chatId = callback.message?.chat?.id;
    if (!chatId) return;
    await telegramApi(token, 'answerCallbackQuery', { callback_query_id: callback.id }).catch(() => {});
    const [action, value] = String(callback.data || '').split(':');
    if (action === 'service') {
      const service = serviceById.get(value);
      if (service) await askConsent(chatId, service);
      return;
    }
    if (action === 'consent_yes') {
      const service = serviceById.get(value);
      if (!service) return showCatalog(chatId, 'Услуга не найдена.');
      await saveChat(chatId, 'awaiting_name', { serviceId: service.id });
      await send(chatId, 'Как к вам обращаться? Напишите имя.');
      return;
    }
    if (action === 'consent_no') {
      await saveChat(chatId, 'idle', {});
      await send(chatId, 'Хорошо, заявку не создавал.');
      return showCatalog(chatId);
    }
  };

  const handleMessage = async (message) => {
    const chatId = message.chat?.id;
    if (!chatId) return;
    const text = clip(message.text, 2000);
    if (/^\/cancel(?:@\w+)?$/i.test(text)) {
      await saveChat(chatId, 'idle', {});
      await send(chatId, 'Заявка отменена.');
      return showCatalog(chatId);
    }
    if (/^\/services(?:@\w+)?$/i.test(text)) {
      await saveChat(chatId, 'idle', {});
      return showCatalog(chatId);
    }
    if (/^\/start(?:@\w+)?(?:\s+(.+))?$/i.test(text)) {
      const payload = text.match(/^\/start(?:@\w+)?(?:\s+(.+))?$/i)?.[1] || '';
      const service = payload.match(/^service_(\d+)$/i)?.[1] && serviceById.get(payload.match(/^service_(\d+)$/i)[1]);
      if (service) return askConsent(chatId, service);
      await saveChat(chatId, 'idle', {});
      return showCatalog(chatId, 'Здравствуйте! Я помогу оформить заявку на услугу.');
    }
    const session = await getChat(chatId);
    if (session.state === 'submitted') {
      return send(chatId, `Заявка №${session.data.leadNumber || '—'} уже сохранена. Менеджер свяжется с вами.`);
    }
    if (session.state === 'awaiting_name') {
      if (text.length < 2) return send(chatId, 'Напишите имя (минимум два символа).');
      await saveChat(chatId, 'awaiting_contact', { ...session.data, name: clip(text, 160) });
      return send(chatId, 'Оставьте телефон. Можно нажать кнопку «Поделиться контактом» или написать номер вручную.', {
        reply_markup: { keyboard: [[{ text: 'Поделиться контактом', request_contact: true }]], resize_keyboard: true, one_time_keyboard: true },
      });
    }
    if (session.state === 'awaiting_contact') {
      const phone = clip(message.contact?.phone_number || text, 80);
      if (!phonePattern.test(phone) || phone.replace(/\D/g, '').length < 7) return send(chatId, 'Проверьте номер телефона или поделитесь контактом.');
      await saveChat(chatId, 'awaiting_description', { ...session.data, phone });
      return send(chatId, 'Кратко опишите задачу. Например: что нужно сделать, какой сайт или проект и желаемые сроки.', {
        reply_markup: { remove_keyboard: true },
      });
    }
    if (session.state === 'awaiting_description') {
      if (text.length < 10) return send(chatId, 'Опишите задачу подробнее (минимум 10 символов).');
      const service = serviceById.get(String(session.data.serviceId));
      if (!service) { await saveChat(chatId, 'idle', {}); return showCatalog(chatId, 'Сессия устарела.'); }
      try {
        const client = await pool.connect();
        let lead;
        try {
          await client.query('BEGIN');
          const dbQuery = (sql, values) => client.query(sql, values);
          const catalogOffer = getOfferById(service.id);
          lead = await createLead({
            type: catalogOffer?.kind === 'corporate' ? 'corporate_service' : 'telegram_service',
            topic: service.shortTitle || service.title,
            name: session.data.name,
            phone: session.data.phone,
            comments: text,
            itemsSummary: `Услуга #${service.id}: ${service.shortTitle || service.title}`,
            serviceId: service.id,
            serviceKind: catalogOffer?.kind || 'dev',
            serviceCategory: catalogOffer?.category || '',
            direction: catalogOffer?.direction || '',
            consent: true,
          }, null, 'telegram', dbQuery);
          await saveChat(chatId, 'submitted', { leadNumber: lead.leadNumber }, dbQuery);
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
        await processNotificationOutbox(lead.id);
        await send(chatId, `Заявка №${lead.leadNumber || '—'} сохранена. Менеджер свяжется с вами.`, { reply_markup: { remove_keyboard: true } });
        return;
      } catch (error) {
        return send(chatId, 'Не удалось сохранить заявку. Попробуйте ещё раз позже или напишите /start.');
      }
    }
    return showCatalog(chatId);
  };

  const poll = async () => {
    if (stopped) return;
    try {
      const stored = await query("SELECT value FROM telegram_bot_runtime WHERE key='last_update_id'");
      let offset = Number(stored.rows[0]?.value || 0) || 0;
      const updates = await telegramApi(token, 'getUpdates', { offset, timeout: 25, allowed_updates: ['message', 'callback_query'] });
      for (const update of updates) {
        try {
          if (update.callback_query) await handleCallback(update.callback_query);
          else if (update.message) await handleMessage(update.message);
        } catch (error) {
          console.error(JSON.stringify({ code: 'TELEGRAM_BOT_UPDATE_ERROR', message: clip(error.message, 200) }));
          break;
        }
        offset = Math.max(offset, Number(update.update_id) + 1);
        await query("UPDATE telegram_bot_runtime SET value=$1,updated_at=NOW() WHERE key='last_update_id'", [String(offset)]);
      }
    } catch (error) {
      console.error(JSON.stringify({ code: 'TELEGRAM_BOT_POLL_ERROR', message: clip(error.message, 200) }));
      await new Promise((resolve) => { timer = setTimeout(resolve, 5000); });
    }
    if (!stopped) setImmediate(poll);
  };

  const stop = async () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    if (cleanupTimer) clearInterval(cleanupTimer);
    if (lockClient) {
      await lockClient.query('SELECT pg_advisory_unlock(263901, 1)').catch(() => {});
      lockClient.release();
      lockClient = null;
    }
  };
  (async () => {
    lockClient = await pool.connect();
    const lockResult = await lockClient.query('SELECT pg_try_advisory_lock(263901, 1) AS locked');
    if (!lockResult.rows[0]?.locked) {
      console.log('Telegram service bot is already running on another server process.');
      lockClient.release();
      lockClient = null;
      return;
    }
    await query("DELETE FROM telegram_bot_chats WHERE updated_at < NOW() - INTERVAL '30 days'");
    const bot = await telegramApi(token, 'getMe');
    const webhook = await telegramApi(token, 'getWebhookInfo');
    if (webhook?.url) {
      console.error(JSON.stringify({ code: 'TELEGRAM_BOT_WEBHOOK_CONFLICT', message: 'Disable the webhook to use polling.' }));
      await stop();
      return;
    }
    await telegramApi(token, 'setMyCommands', { commands: [
      { command: 'start', description: 'Открыть каталог услуг' },
      { command: 'services', description: 'Показать услуги' },
      { command: 'cancel', description: 'Отменить заявку' },
    ] }).catch(() => console.error(JSON.stringify({ code: 'TELEGRAM_BOT_COMMANDS_WARNING', message: 'Could not register Telegram commands.' })));
    if (bot.username && !process.env.PUBLIC_TELEGRAM_BOT_URL) {
      await query(`UPDATE site_settings SET value=jsonb_set(value,'{telegramBotUrl}',to_jsonb($1::text),true),updated_at=NOW()
        WHERE key='contacts' AND COALESCE(value->>'telegramBotUrl','')=''`, [`https://t.me/${bot.username}`]);
    }
    cleanupTimer = setInterval(() => {
      query("DELETE FROM telegram_bot_chats WHERE updated_at < NOW() - INTERVAL '30 days'")
        .catch(() => console.error(JSON.stringify({ code: 'TELEGRAM_BOT_CLEANUP_ERROR' })));
    }, 24 * 60 * 60 * 1000);
    cleanupTimer.unref();
    console.log(`Telegram service bot enabled: @${bot.username || 'unknown'}`);
    poll();
  })().catch(async (error) => {
    console.error(JSON.stringify({ code: 'TELEGRAM_BOT_START_ERROR', message: clip(error.message, 200) }));
    await stop();
  });
  return { stop };
};

module.exports = { startTelegramBot };
