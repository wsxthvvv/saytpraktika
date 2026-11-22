-- Одна тестовая карточка для проверки каталога.
-- Остаток равен нулю, поэтому карточку можно увидеть, но нельзя оформить в заказ.
INSERT INTO products (
  id, sku, slug, title, category, price, currency, description, image, images,
  stock, warranty, shipping_time, metadata, is_active
) VALUES (
  'test-miner-01',
  'TEST-MINER-01',
  'test-miner-01',
  'Тестовый ASIC-майнер (витрина)',
  'miner',
  1.00,
  'USD',
  'ТЕСТОВАЯ МОДЕЛЬ для проверки каталога. К заказу недоступна: цена и наличие не являются коммерческим предложением.',
  '/catalog/test-miner.svg',
  '[]'::jsonb,
  0,
  'Тестовая карточка',
  'Не поставляется',
  '{
    "brand": "Test Brand",
    "model": "TB-01",
    "algorithm": "SHA-256",
    "coins": "BTC, BCH",
    "hashrate": "100 TH/s",
    "power": "3200 W",
    "noise": "75 dB",
    "size": "400 × 195 × 290 мм",
    "weight": "15 кг",
    "testOnly": true
  }'::jsonb,
  TRUE
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  image = EXCLUDED.image,
  stock = EXCLUDED.stock,
  metadata = EXCLUDED.metadata,
  is_active = TRUE,
  updated_at = NOW();
