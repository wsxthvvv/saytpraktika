const RBC_RSS_URL = 'https://rssexport.rbc.ru/rbcnews/news/30/full.rss';
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

// Последняя короткая подборка нужна только как временное состояние,
// если RSS недоступен из браузера. При успешной загрузке она заменяется свежей лентой.
const FALLBACK_NEWS = [
  {
    id: 'rbc-fallback-1',
    title: 'Глава МИД Иордании оценил риски дальнейшей эскалации на Ближнем Востоке',
    excerpt: 'Действия израильского правительства в отношении палестинцев могут привести к новому витку конфликта, заявил министр иностранных дел Иордании.',
    category: 'Политика',
    date: '2026-09-24T20:54:54+03:00',
    link: 'https://www.rbc.ru/rbcfreenews/6ab55c63b69ff33bf4272e75',
    source: 'РБК'
  },
  {
    id: 'rbc-fallback-2',
    title: 'Украинка ушла с пьедестала на ЧЕ по боксу перед гимном России',
    excerpt: 'Анна Охота проиграла россиянке Юлии Чумгалаковой в финале категории до 48 кг.',
    category: 'Спорт',
    date: '2026-09-24T20:44:18+03:00',
    link: 'https://www.rbc.ru/sport/24/09/2026/6ab55b509a79473fa73961df',
    source: 'РБК'
  },
  {
    id: 'rbc-fallback-3',
    title: 'Режиссер «Девятой планеты» рассказал, почему время сказок в кино уходит',
    excerpt: 'Сказки уступают место фантастике, а российское кино продолжает искать оригинальные сюжеты.',
    category: 'Общество',
    date: '2026-09-24T20:44:01+03:00',
    link: 'https://www.rbc.ru/society/24/09/2026/6ab52f97667ef03ad6dee81a',
    source: 'РБК'
  }
];

const stripMarkup = (value = '') => {
  const container = document.createElement('div');
  container.innerHTML = value;
  return container.textContent.replace(/\s+/g, ' ').trim();
};

const truncate = (value, maxLength = 220) => (
  value.length > maxLength ? `${value.slice(0, maxLength).trim()}...` : value
);

const normaliseItem = (item, index) => {
  const title = stripMarkup(item.title || '');
  const description = stripMarkup(item.description || item.content || '');
  const link = item.link || item.guid || '';
  const date = item.pubDate || item.pubdate || item.date || '';

  if (!title || !link) return null;

  return {
    id: item.guid || link || `rbc-${index}`,
    title,
    excerpt: truncate(description),
    category: stripMarkup(item.category || 'Главные новости'),
    date,
    link,
    source: 'РБК'
  };
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

export const fetchRbcNews = async (signal) => {
  const sources = [
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
      if (items.length > 0) return items;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Не удалось загрузить ленту РБК');
};

export { FALLBACK_NEWS, RBC_RSS_URL, REFRESH_INTERVAL_MS };
