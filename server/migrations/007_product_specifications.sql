-- Не показываем товарные предложения без бренда/модели и обязательных данных майнера.
-- Заказы хранят снимки товара, поэтому прошлые покупки не меняются.
UPDATE products
SET is_active = FALSE, updated_at = NOW()
WHERE is_active = TRUE
  AND (
    NULLIF(BTRIM(metadata->>'brand'), '') IS NULL
    OR NULLIF(BTRIM(metadata->>'model'), '') IS NULL
    OR (category = 'miner' AND (
      NULLIF(BTRIM(metadata->>'algorithm'), '') IS NULL
      OR NULLIF(BTRIM(metadata->>'coins'), '') IS NULL
      OR NULLIF(BTRIM(metadata->>'hashrate'), '') IS NULL
      OR NULLIF(BTRIM(metadata->>'power'), '') IS NULL
      OR NULLIF(BTRIM(metadata->>'noise'), '') IS NULL
      OR NULLIF(BTRIM(metadata->>'size'), '') IS NULL
      OR NULLIF(BTRIM(metadata->>'weight'), '') IS NULL
    ))
  );
