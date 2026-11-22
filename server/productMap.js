const mapProductRow = (row, options = {}) => {
  const metadata = row.metadata || {};
  const base = {
    id: row.id,
    title: row.title,
    category: row.category,
    price: Number(row.price),
    currency: row.currency,
    description: row.description,
    image: row.image,
    images: Array.isArray(row.images) ? row.images : [],
    sku: row.sku || '',
    slug: row.slug || row.id,
    stock: row.stock == null ? null : Number(row.stock),
    isAvailable: row.currency === 'USD' && Number(row.stock) > 0 && Number(row.price) > 0,
    averageRating: Number(row.average_rating || 0),
    reviewCount: Number(row.review_count || 0),
    availableAt: row.available_at,
    warranty: row.warranty || metadata.warranty || '',
    shippingTime: row.shipping_time || metadata.shipping || '',
    isActive: row.is_active !== false && row.is_active !== 'f',
    metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (options.minerShape || row.category === 'miner') {
    return {
      ...metadata,
      id: String(row.id),
      title: row.title,
      category: row.category,
      price: Number(row.price),
      originalPrice: Number(row.price),
      previousPrice: Number(metadata.previousPrice) > Number(row.price) ? Number(metadata.previousPrice) : null,
      description: row.description,
      image: row.image,
      images: Array.isArray(row.images) ? row.images : [],
      currency: row.currency,
      stock: row.stock == null ? null : Number(row.stock),
      createdAt: row.created_at,
      warranty: row.warranty || metadata.warranty || '',
      shippingTime: row.shipping_time || metadata.shipping || '',
      isAvailable: row.currency === 'USD' && Number(row.stock) > 0 && Number(row.price) > 0,
      averageRating: Number(row.average_rating || 0),
      reviewCount: Number(row.review_count || 0),
      sku: row.sku || '',
      slug: row.slug || row.id,
      isActive: row.is_active !== false && row.is_active !== 'f',
    };
  }
  return base;
};

module.exports = { mapProductRow };
