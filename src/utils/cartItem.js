/** Позиции для оформления через корзину: майнеры и товары каталога (не услуги). */
export const isCartEligibleItem = (item) => {
  if (!item?.id) return false;
  const id = String(item.id);
  if (id.startsWith('consult-')) return false;
  if (id.startsWith('product-')) return true;
  if (id.startsWith('miner-')) return true;
  if (/^\d+$/.test(id)) return true;
  return false;
};

export const cartItemKindLabel = (item) => {
  const id = String(item?.id ?? '');
  if (id.startsWith('product-')) return 'товар';
  return 'майнер';
};
