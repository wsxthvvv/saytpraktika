const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export const formatUsd = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? usdFormatter.format(amount) : '—';
};



