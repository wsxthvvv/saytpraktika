/** Позиции для оформления через корзину: майнеры и товары каталога (не услуги). */
export const isCartEligibleItem = (item) => {
  return Boolean(item?.id) && ['miner', 'computer'].includes(item.category);
};

export const cartItemKindLabel = (item) => {
  const id = String(item?.id ?? '');
  if (id.startsWith('product-')) return 'товар';
  return 'майнер';
};
