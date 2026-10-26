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

// Existing displayed ruble prices were converted to USD at 81.14 RUB/USD.
export const rubToUsd = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount / 81.14 : NaN;
};

export const formatRubPriceAsUsd = (value) => String(value)
  .replace(/\d[\d\s]*/g, (raw) => {
    const rubAmount = Number(raw.replace(/\s/g, ''));
    return formatUsd(rubToUsd(rubAmount));
  })
  .replace(/\s*₽/g, '');


