import { useMemo, useState } from 'react';
import page from '../data/investmentsPage.json';
import ServiceLeadModal from '../components/ServiceLeadModal';
import { useSiteSettings } from '../contexts/SiteSettingsContext';

const fmt = (n) => Number(n).toLocaleString('ru-RU');

const INVEST_LEAD_BASE = {
  id: 201,
  kind: 'corporate',
  category: 'Mining',
  direction: 'investments',
  title: 'Инвестиции в майнинг',
};

const InvestmentsPage = () => {
  const { contacts } = useSiteSettings();
  const [amount, setAmount] = useState(page.defaultAmount);
  const [months, setMonths] = useState(page.defaultMonths);
  const [calcEmail, setCalcEmail] = useState('');
  const [leadOffer, setLeadOffer] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);

  const { monthlyIncome, totalProfit, totalReturn } = useMemo(() => {
    const monthly = Math.round((amount * page.annualRate) / 12);
    const profit = Math.round(amount * page.annualRate * (months / 12));
    return {
      monthlyIncome: monthly,
      totalProfit: profit,
      totalReturn: amount + profit,
    };
  }, [amount, months]);

  const openLead = (title, extraComments = '', prefillEmail = '') => {
    setLeadOffer({
      ...INVEST_LEAD_BASE,
      title,
      desc: page.hero.lead,
      commentsPreset: extraComments,
      prefillEmail,
    });
  };

  const requestCalculation = (event) => {
    event.preventDefault();
    const summary = [
      `Сумма: ${fmt(amount)} ₽`,
      `Срок: ${months} мес.`,
      `Ориентир дохода: ${fmt(totalProfit)} ₽`,
      calcEmail ? `Email: ${calcEmail}` : null,
    ]
      .filter(Boolean)
      .join('; ');
    openLead('Расчёт доходности по инвестициям', summary, calcEmail.trim());
  };

  return (
    <div className="invest-page">
      <section className="invest-hero">
        <div className="invest-hero__main">
          <p className="invest-badge">{page.hero.badge}</p>
          <h1 className="invest-hero__title">
            {page.hero.title} — <span className="invest-hero__accent">{page.hero.titleHighlight}</span>
          </h1>
          <p className="invest-hero__lead">{page.hero.lead}</p>
          <div className="invest-hero__cta">
            <button
              type="button"
              className="btn"
              onClick={() => openLead('Консультация по инвестициям')}
            >
              Обсудить инвестиции
            </button>
            <a className="btn-outline invest-hero__mail" href={`mailto:${contacts.email}`}>
              Запросить детали
            </a>
          </div>
        </div>
        <aside className="invest-key-terms" aria-label={page.hero.keyTermsTitle}>
          <h2>{page.hero.keyTermsTitle}</h2>
          <dl>
            {page.hero.keyTerms.map((row) => (
              <div key={row.label} className="invest-key-terms__row">
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </section>

      <div className="invest-stats" role="list">
        {page.stats.map((item) => (
          <div key={item.label} className="invest-stats__item" role="listitem">
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <section className="invest-section" aria-labelledby="invest-adv-title">
        <h2 id="invest-adv-title" className="invest-section__title">{page.advantagesTitle}</h2>
        <p className="invest-section__subtitle">{page.advantagesSubtitle}</p>
        <div className="invest-advantages">
          {page.advantages.map((item) => (
            <article key={item.title} className="invest-adv-card">
              <span className="invest-adv-card__icon" aria-hidden="true">{item.icon}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="invest-calculator" aria-labelledby="invest-calc-title">
        <header className="invest-calculator__head">
          <h2 id="invest-calc-title">Калькулятор доходности</h2>
          <p>Рассчитайте ориентировочный доход от инвестиций</p>
        </header>
        <div className="invest-calculator__grid">
          <form className="invest-calculator__form" onSubmit={requestCalculation}>
            <label className="invest-range">
              <span className="invest-range__label">
                Сумма инвестиций: <strong>{fmt(amount)} ₽</strong>
              </span>
              <input
                type="range"
                min={page.minAmount}
                max={page.maxAmount}
                step={500000}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
              <span className="invest-range__hints">
                <span>1 млн</span>
                <span>50 млн</span>
              </span>
            </label>
            <label className="invest-range">
              <span className="invest-range__label">
                Срок размещения: <strong>{months} мес.</strong>
              </span>
              <input
                type="range"
                min={page.minMonths}
                max={page.maxMonths}
                step={1}
                value={months}
                onChange={(e) => setMonths(Number(e.target.value))}
              />
              <span className="invest-range__hints">
                <span>1 год</span>
                <span>3 года</span>
              </span>
            </label>
            <label className="invest-field">
              <span className="visually-hidden">Email</span>
              <input
                type="email"
                placeholder="your@email.com"
                value={calcEmail}
                onChange={(e) => setCalcEmail(e.target.value)}
                autoComplete="email"
              />
            </label>
            <button type="submit" className="btn invest-calculator__submit">
              Получить расчёт
            </button>
          </form>
          <div className="invest-calculator__result" aria-live="polite">
            <h3>Ваш доход</h3>
            <p className="invest-result-line invest-result-line--green">
              Средний доход в месяц: <strong>{fmt(monthlyIncome)} ₽</strong>
            </p>
            <p className="invest-result-line">
              Общий доход за {months} мес.: <strong>{fmt(totalProfit)} ₽</strong>
            </p>
            <p className="invest-result-total">
              Итого к возврату: <strong>{fmt(totalReturn)} ₽</strong>
            </p>
            <p className="invest-calculator__note">{page.calculatorDisclaimer}</p>
          </div>
        </div>
      </section>

      <section className="invest-section" aria-labelledby="invest-steps-title">
        <h2 id="invest-steps-title" className="invest-section__title">{page.stepsTitle}</h2>
        <p className="invest-section__subtitle">{page.stepsSubtitle}</p>
        <ol className="invest-steps">
          {page.steps.map((step, index) => (
            <li key={step.title} className="invest-step">
              <span className="invest-step__num" aria-hidden="true">{index + 1}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="invest-section" aria-labelledby="invest-table-title">
        <h2 id="invest-table-title" className="invest-section__title">{page.instrumentsTitle}</h2>
        <p className="invest-section__subtitle">{page.instrumentsSubtitle}</p>
        <div className="invest-table-wrap">
          <table className="invest-table">
            <thead>
              <tr>
                <th scope="col">Направление</th>
                <th scope="col">Доля</th>
                <th scope="col">Описание</th>
                <th scope="col">Доходность</th>
              </tr>
            </thead>
            <tbody>
              {page.instruments.map((row) => (
                <tr key={row.direction}>
                  <th scope="row">{row.direction}</th>
                  <td>{row.share}</td>
                  <td>{row.description}</td>
                  <td className="invest-table__yield">{row.yield}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="invest-section" aria-labelledby="invest-guarantees-title">
        <h2 id="invest-guarantees-title" className="invest-section__title">{page.guaranteesTitle}</h2>
        <p className="invest-section__subtitle">{page.guaranteesSubtitle}</p>
        <div className="invest-guarantees">
          {page.guarantees.map((card) => (
            <article key={card.title} className="invest-guarantee-card">
              <h3>{card.title}</h3>
              <ul>
                {card.items.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="invest-section invest-faq" aria-labelledby="invest-faq-title">
        <h2 id="invest-faq-title" className="invest-section__title">{page.faqTitle}</h2>
        <p className="invest-section__subtitle">{page.faqSubtitle}</p>
        <div className="invest-faq__list">
          {page.faq.map((item, index) => {
            const open = openFaq === index;
            const panelId = `invest-faq-panel-${index}`;
            return (
              <div key={item.q} className={`invest-faq__item${open ? ' is-open' : ''}`}>
                <button
                  type="button"
                  className="invest-faq__trigger"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOpenFaq(open ? null : index)}
                >
                  {item.q}
                </button>
                <div id={panelId} className="invest-faq__panel" hidden={!open}>
                  <p>{item.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="invest-cta">
        <h2>{page.ctaTitle}</h2>
        <p>{page.ctaSubtitle}</p>
        <div className="invest-cta__actions">
          <button type="button" className="btn" onClick={() => openLead('Заказ консультации по инвестициям')}>
            Заказать консультацию
          </button>
          <button
            type="button"
            className="btn-outline"
            onClick={() => openLead('Запрос расчёта доходности')}
          >
            Запросить расчёт
          </button>
        </div>
      </section>

      <ServiceLeadModal service={leadOffer} onClose={() => setLeadOffer(null)} />
    </div>
  );
};

export default InvestmentsPage;