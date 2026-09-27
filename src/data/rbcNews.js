const RBC_RSS_URL = 'https://rssexport.rbc.ru/rbcnews/news/100/full.rss';
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

const CRYPTO_TOPIC_PATTERN = new RegExp(
  [
    'крипт',
    'криптовал',
    'биткоин',
    'bitcoin',
    'btc\\b',
    'ethereum',
    'эфир',
    'eth\\b',
    'блокчейн',
    'blockchain',
    'майнинг',
    'mining',
    'web3',
    'defi',
    'nft',
    'стейбл',
    'stablecoin',
    'usdt',
    'токен',
    'token',
    'цифров(?:ой|ые)\\s+актив',
    'криптобирж',
    'крипторын',
    'криптоактив',
    'альткоин',
    'сатоши',
    'hashrate',
    'хешрейт',
    'proof-of-stake',
    'proof-of-work',
    '/crypto/',
    'цифров(?:ой|ые)\\s+руб',
    'cbdc',
  ].join('|'),
  'i'
);

const FALLBACK_NEWS = [
  {
    id: 'rbc-fallback-crypto-1',
    title: 'Регулирование криптовалют в России: что меняется для инвесторов и майнеров',
    excerpt: 'Обзор ключевых инициатив по цифровым активам, легализации майнинга и требованиям к обмену криптовалют.',
    category: 'Крипто',
    date: new Date().toISOString(),
    link: 'https://www.rbc.ru/crypto/',
    source: 'РБК'
  },
  {
    id: 'rbc-fallback-crypto-2',
    title: 'Курсы Bitcoin и Ethereum: динамика рынка и факторы недели',
    excerpt: 'Как макроэкономика и регуляторные новости влияют на котировки основных монет и ликвидность на биржах.',
    category: 'Криптовалюты',
    date: new Date(Date.now() - 3600000).toISOString(),
    link: 'https://www.rbc.ru/crypto/',
    source: 'РБК'
  },
  {
    id: 'rbc-fallback-crypto-3',
    title: 'Майнинг и инфраструктура: энергетика, оборудование и новые правила отрасли',
    excerpt: 'Сводка материалов РБК о промышленном майнинге, тарифах на электричество и легализации площадок.',
    category: 'Майнинг',
    date: new Date(Date.now() - 7200000).toISOString(),
    link: 'https://www.rbc.ru/crypto/tag/mining',
    source: 'РБК'
  }
];

const stripMarkup = (value = '') => {
  const container = document.createElement('div');
  container.innerHTML = value;
  return container.textContent.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
};

const truncate = (value, maxLength = 220) => (
  value.length > maxLength ? `${value.slice(0, maxLength).trim()}...` : value
);

const isCryptoRelated = (item) => {
  const haystack = [
    item.title,
    item.excerpt,
    item.category,
    item.link,
  ].join(' ');

  return CRYPTO_TOPIC_PATTERN.test(haystack);
};

const sortByDateDesc = (items) => [...items].sort((a, b) => {
  const ta = new Date(a.date).getTime();
  const tb = new Date(b.date).getTime();
  if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
  return tb - ta;
});

const normaliseItem = (item, index) => {
  const title = stripMarkup(item.title || '');
  const description = stripMarkup(item.description || item.content || '');
  const link = item.link || item.guid || '';
  const date = item.pubDate || item.pubdate || item.date || '';

  if (!title || !link) return null;

  const category = stripMarkup(item.category || 'Главные новости');
  const normalized = {
    id: item.guid || link || `rbc-${index}`,
    title,
    excerpt: truncate(description),
    category: /crypto/i.test(link) ? 'Крипто' : category,
    date,
    link,
    source: 'РБК'
  };

  return isCryptoRelated(normalized) ? normalized : null;
};

const parseXmlFeed = (xmlText) => {
  const xml = new DOMParser().parseFromString(xmlText, 'text/xml');
  if (xml.querySelector('parsererror')) {
    throw new Error('РБК вернул некорректный RSS');
  }

  return Array.from(xml.querySelectorAll('item'))
    .map((item, index) => normaliseItem({
      title: item.querySelector('title')?.textContent,
      description: item.querySelector('description')?.textContent,
      category: item.querySelector('category')?.textContent,
      pubDate: item.querySelector('pubDate')?.textContent,
      link: item.querySelector('link')?.textContent,
      guid: item.querySelector('guid')?.textContent
    }, index))
    .filter(Boolean);
};

const parseRss2JsonFeed = (payload) => (payload.items || [])
  .map((item, index) => normaliseItem(item, index))
  .filter(Boolean);

const fetchJson = async (url, signal) => {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

const fetchText = async (url, signal) => {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
};

const loadFeedItems = async (signal, limit = 24) => {
  const sources = [
    async () => {
      const response = await fetch(`/api/rbc-news?limit=${limit}`, { signal });
      if (!response.ok) throw new Error(`API ${response.status}`);
      const payload = await response.json();
      if (!payload.items?.length) throw new Error('Empty API feed');
      return sortByDateDesc(payload.items);
    },
    async () => parseXmlFeed(await fetchText(RBC_RSS_URL, signal)),
    async () => parseRss2JsonFeed(await fetchJson(
      `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RBC_RSS_URL)}`,
      signal
    )),
    async () => parseXmlFeed(await fetchText(
      `https://api.allorigins.win/raw?url=${encodeURIComponent(RBC_RSS_URL)}`,
      signal
    ))
  ];

  let lastError;
  for (const loadSource of sources) {
    try {
      const items = await loadSource();
      if (items.length > 0) return sortByDateDesc(items);
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) throw lastError;
  return [];
};

export const fetchRbcNews = async (signal, limit = 24) => {
  try {
    const items = await loadFeedItems(signal, limit);
    if (items.length > 0) return items;
  } catch {
    /* use fallback below */
  }

  return FALLBACK_NEWS;
};

export { FALLBACK_NEWS, RBC_RSS_URL, REFRESH_INTERVAL_MS, isCryptoRelated };
