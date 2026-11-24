-- Тестовая карточка больше не показывается в публичном каталоге.
UPDATE products
SET is_active = FALSE,
    stock = 0,
    updated_at = NOW()
WHERE id = 'test-miner-01';