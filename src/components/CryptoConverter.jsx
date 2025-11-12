import React, { useState, useEffect } from 'react';

const CryptoConverter = () => {
  const [cryptoRates, setCryptoRates] = useState({});
  const [fiatRate, setFiatRate] = useState(90);
  const [fromAmount, setFromAmount] = useState(1);
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('BTC');
  const [result, setResult] = useState(0);
  const [loading, setLoading] = useState(true);

  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$', type: 'fiat' },
    { code: 'RUB', name: 'Russian Ruble', symbol: '₽', type: 'fiat' },
    { code: 'BTC', name: 'Bitcoin', symbol: '₿', type: 'crypto', id: 'bitcoin' },
    { code: 'ETH', name: 'Ethereum', symbol: 'Ξ', type: 'crypto', id: 'ethereum' },
  ];

  const fetchCryptoRates = async () => {
    try {
      const res = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd,rub'
      );
      const data = await res.json();
      setCryptoRates(data);
    } catch (err) {
      console.error('Ошибка загрузки курсов криптовалют:', err);
    }
  };

  const fetchFiatRate = async () => {
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      const data = await res.json();
      if (data.rates?.RUB) {
        setFiatRate(data.rates.RUB);
      }
    } catch (err) {
      console.error('Ошибка загрузки курса USD/RUB:', err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchCryptoRates(), fetchFiatRate()]);
      setLoading(false);
    };

    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

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
    if (!cryptoRates.bitcoin?.usd || !cryptoRates.ethereum?.usd) {
      setResult(0);
      return;
    }

    let usdAmount = 0;
    if (fromCurrency === 'USD') usdAmount = fromAmount;
    else if (fromCurrency === 'RUB') usdAmount = fromAmount / fiatRate;
    else if (fromCurrency === 'BTC') usdAmount = fromAmount * cryptoRates.bitcoin.usd;
    else if (fromCurrency === 'ETH') usdAmount = fromAmount * cryptoRates.ethereum.usd;

    let finalAmount = 0;
    if (toCurrency === 'USD') finalAmount = usdAmount;
    else if (toCurrency === 'RUB') finalAmount = usdAmount * fiatRate;
    else if (toCurrency === 'BTC') finalAmount = usdAmount / cryptoRates.bitcoin.usd;
    else if (toCurrency === 'ETH') finalAmount = usdAmount / cryptoRates.ethereum.usd;

    setResult(finalAmount);
  }, [fromAmount, fromCurrency, toCurrency, cryptoRates, fiatRate]);

  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  return (
    <div className="crypto-converter-page">
      <div className="container">
        <h2 className="section-title">Конвертер криптовалют</h2>
        <p className="converter-subtitle">
          Мгновенная конвертация между криптовалютами и фиатными валютами с актуальными курсами.
        </p>

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
                    {curr.symbol} {curr.code}
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
                      {result.toLocaleString('en-US', {
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
                    {curr.symbol} {curr.code}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="rates-panel">
          <h3 className="rates-panel__title">Актуальные курсы</h3>
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
                {loading ? '—' : `1 $ = ${fiatRate?.toFixed(2)} ₽`}
              </div>
            </div>
          </div>
          <p className="rates-panel__note">
            Данные обновляются каждую минуту
          </p>
        </div>
      </div>
    </div>
  );
};

export default CryptoConverter;