const pickAddressFromCollection = (collection) => {
  if (!collection) return null;
  const len = typeof collection.getLength === 'function' ? collection.getLength() : 0;
  for (let i = 0; i < len; i += 1) {
    const geoObject = collection.get(i);
    const meta = geoObject.properties?.get('metaDataProperty.GeocoderMetaData') || {};
    const line = meta.text || geoObject.getAddressLine?.() || geoObject.properties?.get('name');
    if (line) return String(line).trim();
  }
  return null;
};

/** Обратное геокодирование в браузере (Яндекс JS API). */
export async function reverseGeocodeDeliveryAddress(ymaps, coords) {
  const attempts = [
    { kind: 'house' },
    {},
    { kind: 'street' },
  ];

  for (const options of attempts) {
    try {
      const res = await ymaps.geocode(coords, { results: 5, ...options });
      const line = pickAddressFromCollection(res.geoObjects);
      if (line) return line;
    } catch {
      /* пробуем следующий вариант */
    }
  }
  return null;
}

/** Запасной путь: геокодер на backend (если в ключе ограничен Referrer). */
export async function reverseGeocodeViaApi(coords) {
  const [latitude, longitude] = coords;
  const response = await fetch(
    `/api/geocode/reverse?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`,
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) return null;
  return data.address || null;
}

export async function resolveDeliveryAddress(ymaps, coords) {
  const fromJs = ymaps ? await reverseGeocodeDeliveryAddress(ymaps, coords).catch(() => null) : null;
  if (fromJs) return fromJs;
  return reverseGeocodeViaApi(coords);
}
