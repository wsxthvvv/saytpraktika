-- Восстановление витрины Antminer (101–112): поля публикации и is_active.
UPDATE products
SET
  sku = COALESCE(NULLIF(BTRIM(sku), ''), 'BM-' || id),
  slug = COALESCE(NULLIF(BTRIM(slug), ''), id),
  stock = COALESCE(stock, 3),
  warranty = COALESCE(NULLIF(BTRIM(warranty), ''), NULLIF(BTRIM(metadata->>'warranty'), ''), '180 дней'),
  shipping_time = COALESCE(NULLIF(BTRIM(shipping_time), ''), NULLIF(BTRIM(metadata->>'shipping'), ''), '14 дней'),
  currency = 'USD',
  metadata = metadata
    || jsonb_build_object(
      'brand', COALESCE(NULLIF(BTRIM(metadata->>'brand'), ''), 'Bitmain'),
      'model', COALESCE(
        NULLIF(BTRIM(metadata->>'model'), ''),
        NULLIF(BTRIM(REGEXP_REPLACE(title, '^Antminer\s+', '')), ''),
        title
      ),
      'noise', COALESCE(NULLIF(BTRIM(metadata->>'noise'), ''), '75 dB'),
      'size', COALESCE(NULLIF(BTRIM(metadata->>'size'), ''), '400 × 195 × 290 mm'),
      'weight', COALESCE(NULLIF(BTRIM(metadata->>'weight'), ''), '15 kg')
    ),
  is_active = TRUE,
  updated_at = NOW()
WHERE category = 'miner'
  AND id ~ '^[0-9]+$'
  AND price > 0
  AND image IS NOT NULL;