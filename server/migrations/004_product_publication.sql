-- Скрываем карточки, которые ещё не заполнены для публичной продажи.
-- Данные и ссылки в истории заказов сохраняются.
UPDATE products
SET is_active = FALSE, updated_at = NOW()
WHERE is_active = TRUE
  AND (
    category NOT IN ('miner', 'computer')
    OR currency <> 'USD'
    OR price <= 0
    OR sku IS NULL OR BTRIM(sku) = ''
    OR stock IS NULL
    OR BTRIM(description) = ''
    OR image IS NULL OR BTRIM(image) = ''
    OR BTRIM(warranty) = ''
    OR BTRIM(shipping_time) = ''
    OR (category = 'miner' AND (
      NULLIF(BTRIM(metadata->>'algorithm'), '') IS NULL
      OR NULLIF(BTRIM(metadata->>'coins'), '') IS NULL
      OR NULLIF(BTRIM(metadata->>'hashrate'), '') IS NULL
      OR NULLIF(BTRIM(metadata->>'power'), '') IS NULL
    ))
  );
