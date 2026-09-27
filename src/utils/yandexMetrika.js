const METRIKA_ID = process.env.REACT_APP_YANDEX_METRIKA_ID;

export function initYandexMetrika() {
  if (!METRIKA_ID || typeof window === 'undefined') return;
  if (window.ym) return;

  window.ym = window.ym || function ymStub() {
    (window.ym.a = window.ym.a || []).push(arguments);
  };
  window.ym.l = Date.now();

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://mc.yandex.ru/metrika/tag.js';
  document.head.appendChild(script);

  window.ym(Number(METRIKA_ID), 'init', {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: false,
  });
}
