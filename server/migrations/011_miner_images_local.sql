-- bitmain.com.vc недоступен с ПК/сервера — локальная витрина до загрузки своих фото.
UPDATE products
SET image = '/catalog/miner-default.svg',
    images = '[]'::jsonb,
    updated_at = NOW()
WHERE category = 'miner'
  AND image ILIKE '%bitmain.com.vc%';