/** Обратное геокодирование через HTTP API Яндекса (ключ только на сервере). */
const reverseGeocodeCoords = async (latitude, longitude) => {
  const apiKey = process.env.YANDEX_GEOCODER_API_KEY || process.env.REACT_APP_YANDEX_MAPS_API_KEY;
  if (!apiKey || apiKey === 'your-yandex-maps-api-key') {
    return { ok: false, error: 'missing_api_key' };
  }

  const lon = Number(longitude);
  const lat = Number(latitude);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
    return { ok: false, error: 'invalid_coords' };
  }

  const url = new URL('https://geocode-maps.yandex.ru/v1/');
  url.searchParams.set('apikey', apiKey);
  url.searchParams.set('geocode', `${lon},${lat}`);
  url.searchParams.set('format', 'json');
  url.searchParams.set('lang', 'ru_RU');
  const fetchMembers = async (withHouseKind) => {
    const requestUrl = new URL(url);
    if (withHouseKind) requestUrl.searchParams.set('kind', 'house');
    requestUrl.searchParams.set('results', '5');
    const response = await fetch(requestUrl);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { error: data.message || `HTTP ${response.status}` };
    }
    return { members: data?.response?.GeoObjectCollection?.featureMember || [] };
  };

  let { members, error } = await fetchMembers(true);
  if (error || !members?.length) {
    ({ members, error } = await fetchMembers(false));
  }
  if (error && !members?.length) return { ok: false, error };

  for (const item of members || []) {
    const meta = item?.GeoObject?.metaDataProperty?.GeocoderMetaData;
    const text = meta?.text || item?.GeoObject?.name;
    if (text) return { ok: true, address: text };
  }

  return { ok: false, error: 'not_found' };
};

module.exports = { reverseGeocodeCoords };
