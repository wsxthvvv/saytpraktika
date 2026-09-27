const SCRIPT_ID = 'yandex-maps-api';

export function loadYandexMaps() {
  return new Promise((resolve, reject) => {
    if (window.ymaps?.ready) {
      window.ymaps.ready(() => resolve(window.ymaps));
      return;
    }

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', () => {
        window.ymaps.ready(() => resolve(window.ymaps));
      }, { once: true });
      existing.addEventListener('error', () => reject(new Error('yandex_maps_load_failed')), { once: true });
      return;
    }

    const apiKey = process.env.REACT_APP_YANDEX_MAPS_API_KEY;
    let url = 'https://api-maps.yandex.ru/2.1/?lang=ru_RU';
    if (apiKey) {
      url += `&apikey=${encodeURIComponent(apiKey)}`;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = url;
    script.async = true;
    script.onload = () => {
      window.ymaps.ready(() => resolve(window.ymaps));
    };
    script.onerror = () => reject(new Error('yandex_maps_load_failed'));
    document.head.appendChild(script);
  });
}
