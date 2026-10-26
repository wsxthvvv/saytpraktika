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
    isActive: row.is_active !== false && row.is_active !== 'f',
    metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (options.minerShape || row.category === 'miner') {
    return {
      id: Number(row.id),
      title: row.title,
      price: Number(row.price),
      description: row.description,
      image: row.image,
      ...metadata,
    };
  }
  return base;
};

module.exports = { mapProductRow };
