const SCRIPT_ID = 'yandex-maps-api';
const LOAD_TIMEOUT_MS = 8000;

export function loadYandexMaps() {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timeout = window.setTimeout(() => fail(new Error('yandex_maps_timeout')), LOAD_TIMEOUT_MS);
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      callback(value);
    };
    const fail = (error) => finish(reject, error);
    const ready = () => {
      if (!window.ymaps?.ready) return fail(new Error('yandex_maps_not_ready'));
      try { window.ymaps.ready(() => finish(resolve, window.ymaps)); }
      catch (error) { fail(error); }
    };

    if (window.ymaps?.ready) return ready();

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', ready, { once: true });
      existing.addEventListener('error', () => fail(new Error('yandex_maps_load_failed')), { once: true });
      if (window.ymaps?.ready) ready();
      return;
    }

    const apiKey = process.env.REACT_APP_YANDEX_MAPS_API_KEY;
    let url = 'https://api-maps.yandex.ru/2.1/?lang=ru_RU&load=package.full';
    if (apiKey && apiKey !== 'your-yandex-maps-api-key') {
      url += `&apikey=${encodeURIComponent(apiKey)}`;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = url;
    script.async = true;
    script.onload = ready;
    script.onerror = () => fail(new Error('yandex_maps_load_failed'));
    document.head.appendChild(script);
  });
}
