import React, { useState, useEffect, useMemo } from 'react';
import { useCryptoRates } from '../contexts/CryptoRatesContext';

const CryptoConverter = () => {
  const { simple, markets, loading: ratesLoading, error: ratesError, updatedAt, stale, refresh } = useCryptoRates();
  const cryptoRates = useMemo(() => simple || {}, [simple]);
  const [fiatRate, setFiatRate] = useState(null);
  const [fromAmount, setFromAmount] = useState(1);
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('BTC');
  const [result, setResult] = useState(0);
  const [fiatLoading, setFiatLoading] = useState(true);
  const [fiatUnavailable, setFiatUnavailable] = useState(false);
  const [fiatUpdatedAt, setFiatUpdatedAt] = useState(null);

  const baseCurrencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$', type: 'fiat' },
    { code: 'RUB', name: 'Russian Ruble', symbol: 'RUB', type: 'fiat' },
  ];
  const cryptoCurrencies = markets.length
    ? [...new Map(markets.filter((market) => market.symbol).map((market) => [String(market.symbol).toUpperCase(), {
      code: String(market.symbol).toUpperCase(), name: market.name, symbol: String(market.symbol).toUpperCase(), type: 'crypto', id: market.id,
    }])).values()]
    : [
      { code: 'BTC', name: 'Bitcoin', symbol: 'BTC', type: 'crypto', id: 'bitcoin' },
      { code: 'ETH', name: 'Ethereum', symbol: 'ETH', type: 'crypto', id: 'ethereum' },
    ];
  const currencies = [...baseCurrencies, ...cryptoCurrencies.filter((currency) => !['USD', 'RUB'].includes(currency.code))];
  const currencyRates = useMemo(() => {
    const rates = { USD: 1 };
    if (fiatRate > 0) rates.RUB = 1 / fiatRate;
    markets.forEach((market) => {
      const code = String(market.symbol || '').toUpperCase();
      const price = Number(market.current_price);
      if (code && Number.isFinite(price) && price > 0) rates[code] = price;
    });
    if (cryptoRates.bitcoin?.usd) rates.BTC = Number(cryptoRates.bitcoin.usd);
    if (cryptoRates.ethereum?.usd) rates.ETH = Number(cryptoRates.ethereum.usd);
    return rates;
  }, [markets, fiatRate, cryptoRates]);

  const fetchFiatRate = async () => {
    try {
      const res = await fetch('/api/crypto/fx', { signal: AbortSignal.timeout(10000) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok && Number.isFinite(Number(data.rate))) {
        setFiatRate(Number(data.rate));
        setFiatUpdatedAt(data.updatedAt || new Date().toISOString());
        setFiatUnavailable(false);
      } else if (!data.rate) setFiatUnavailable(true);
    } catch {
      setFiatUnavailable(true);
    }
  };

  useEffect(() => {
    const loadFiat = async () => {
      setFiatLoading(true);
      await fetchFiatRate();
      setFiatLoading(false);
    };
    loadFiat();
    const interval = setInterval(fetchFiatRate, 60000);
    return () => clearInterval(interval);
  }, []);

  const loading = ratesLoading || fiatLoading;

  const handleInputChange = (e) => {
    let value = e.target.value;
    value = value.replace(/,/g, '.');
    const regex = /^(\d*\.?\d*)$/;
    if (!regex.test(value)) return;
    if (value.startsWith('0') && value.length > 1 && value[1] !== '.') {
      value = value.replace(/^0+/, '');
    }
    if (value === '') value = '0';
    setFromAmount(parseFloat(value) || 0);
  };

  useEffect(() => {
    if (fromCurrency === toCurrency) {
      setResult(fromAmount);
      return;
    }
    const sourceRate = currencyRates[fromCurrency];
    const targetRate = currencyRates[toCurrency];
    if (!(sourceRate > 0) || !(targetRate > 0)) {
      setResult(null);
      return;
    }
    setResult((fromAmount * sourceRate) / targetRate);
  }, [fromAmount, fromCurrency, toCurrency, currencyRates]);

  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  return (
    <div className="crypto-converter-page">
      <div className="container">
        <div className="converter-header">
          <h2 className="section-title">Конвертер криптовалют</h2>
          <p className="converter-subtitle">
            Мгновенная конвертация между криптовалютами и фиатными валютами с актуальными курсами.
          </p>
        </div>

        <div className="converter-card">
          <div className="converter-input-group">
            <label className="converter-label">Отдаете</label>
            <div className="converter-input-wrapper">
              <input
                type="text"
                className="converter-input"
                value={fromAmount}
                onChange={handleInputChange}
                placeholder="0.00"
              />
              <select
                className="converter-select"
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value)}
              >
                {currencies.map((curr) => (
                  <option key={curr.code} value={curr.code}>
                    {curr.symbol === curr.code ? curr.code : `${curr.symbol} ${curr.code}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button onClick={swapCurrencies} className="converter-swap">
            ⇅
          </button>

          <div className="converter-input-group">
            <label className="converter-label">Получаете</label>
            <div className="converter-result-wrapper">
              <div className="converter-result">
                {loading ? (
                  <span className="converter-loading">Загрузка...</span>
                ) : (
                  <>
                    <span className="converter-result-value">
                      {result == null ? '—' : result.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 8,
                      })}
                    </span>
                    <span className="converter-result-currency">{toCurrency}</span>
                  </>
                )}
              </div>
              <select
                className="converter-select"
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value)}
              >
                {currencies.map((curr) => (
                  <option key={curr.code} value={curr.code}>
                    {curr.symbol === curr.code ? curr.code : `${curr.symbol} ${curr.code}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="rates-panel">
          <div className="rates-panel__heading">
            <div><h3 className="rates-panel__title">Актуальные курсы</h3><p className="rates-panel__updated">{stale ? 'Показаны сохранённые значения' : updatedAt ? `Криптовалюты: ${new Date(updatedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` : 'Обновляем котировки…'}{fiatUpdatedAt ? ` · USD/RUB: ${new Date(fiatUpdatedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` : ''}</p></div>
            <button type="button" className="btn-outline rates-panel__refresh" onClick={() => { refresh(); fetchFiatRate(); }}>Обновить</button>
          </div>
          <div className="rates-grid">
            <div className="rate-card">
              <div className="rate-card__header">
                <span className="rate-card__symbol">₿</span>
                <span className="rate-card__name">Bitcoin</span>
              </div>
              <div className="rate-card__price">
                {loading ? '—' : `$${cryptoRates.bitcoin?.usd?.toLocaleString('en-US')}`}
              </div>
            </div>

            <div className="rate-card">
              <div className="rate-card__header">
                <span className="rate-card__symbol">Ξ</span>
                <span className="rate-card__name">Ethereum</span>
              </div>
              <div className="rate-card__price">
                {loading ? '—' : `$${cryptoRates.ethereum?.usd?.toLocaleString('en-US')}`}
              </div>
            </div>

            <div className="rate-card">
              <div className="rate-card__header">
                <span className="rate-card__symbol">$</span>
                <span className="rate-card__name">USD/RUB</span>
              </div>
              <div className="rate-card__price">
                {loading || !fiatRate ? '—' : `1 USD = ${fiatRate.toFixed(2)} RUB`}
              </div>
            </div>
          </div>
          <p className="rates-panel__note">
            Данные обновляются каждую минуту. Котировки справочные и не являются инвестиционной рекомендацией.
          </p>
          {fiatUnavailable && <p className="rates-panel__note" role="status">Курс USD/RUB временно недоступен; расчёт с рублём не показывается.</p>}
          {ratesError && <p className="rates-panel__note" role="status">Источник криптовалют временно недоступен; используются последние сохранённые курсы.</p>}
          <div className="rates-grid rates-grid--api" aria-label="Курсы криптовалют из API">
            {markets.slice(0, 10).map((market) => (
              <div className="rate-card" key={market.id}>
                <div className="rate-card__header">
                  <span className="rate-card__name">{market.symbol} · {market.name}</span>
                </div>
                <div className="rate-card__price">
                  {market.current_price == null ? '—' : `$${Number(market.current_price).toLocaleString('en-US')}`}
                </div>
                <div className={`rate-card__alt ${Number(market.price_change_percentage_24h) >= 0 ? 'positive' : 'negative'}`}>
                  {market.price_change_percentage_24h == null ? '—' : `${Number(market.price_change_percentage_24h).toFixed(2)}% за 24 ч.`}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CryptoConverter;
