import React, { useState } from 'react';

import { formatRussianPhone } from '../utils/phone';

import { authenticateUser, registerUser } from '../utils/userAuth';

import PersonalDataConsentCheckbox from './PersonalDataConsentCheckbox';



const Auth = ({ onLogin, onRegister }) => {

  const [isLogin, setIsLogin] = useState(true);

  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');

  const [firstName, setFirstName] = useState('');

  const [lastName, setLastName] = useState('');

  const [patronymic, setPatronymic] = useState('');

  const [phone, setPhone] = useState('');

  const [pdConsent, setPdConsent] = useState(false);

  const [pdConsentError, setPdConsentError] = useState('');

  const [authError, setAuthError] = useState('');

  const [isBusy, setIsBusy] = useState(false);



  const handleSubmit = async (e) => {

    e.preventDefault();

    if (!isLogin && !pdConsent) {

      setPdConsentError('Необходимо дать согласие на обработку персональных данных');

      return;

    }

    setPdConsentError('');

    setAuthError('');

    setIsBusy(true);



    try {

      if (isLogin) {

        const result = await authenticateUser(email, password);

        if (result.ok) {

          onLogin(result.user);

        } else {

          setAuthError(result.error);

        }

      } else {

        const formattedPhone = formatRussianPhone(phone);

        const fullName = [lastName, firstName, patronymic].filter(Boolean).join(' ');

        const result = await registerUser({

          email,

          password,

          name: firstName || email.split('@')[0],

          firstName,

          lastName,

          patronymic,

          fullName,

          phone: formattedPhone || null,

        });

        if (result.ok) {

          onRegister(result.user);

        } else {

          setAuthError(result.error);

        }

      }

    } catch {

      setAuthError('Не удалось выполнить операцию. Попробуйте ещё раз.');

    } finally {

      setIsBusy(false);

    }

  };



  const toggleMode = () => {

    setIsLogin(!isLogin);

    setEmail('');

    setPassword('');

    setFirstName('');

    setLastName('');

    setPatronymic('');

    setPhone('');

    setPdConsent(false);

    setPdConsentError('');

    setAuthError('');

  };



  return (

    <div className="auth-section">

      <h2 className="section-title">{isLogin ? 'Вход' : 'Регистрация'}</h2>

      <form onSubmit={handleSubmit}>

        {authError && (

          <p className="auth-section__error" role="alert">

            {authError}

          </p>

        )}

        <input

          type="email"

          placeholder="Email"

          value={email}

          onChange={(e) => {

            setEmail(e.target.value);

            if (authError) setAuthError('');

          }}

          required

          autoComplete="email"

        />

        <input

          type="password"

          placeholder="Пароль"

          value={password}

          onChange={(e) => {

            setPassword(e.target.value);

            if (authError) setAuthError('');

          }}

          required

          autoComplete={isLogin ? 'current-password' : 'new-password'}

        />

        {!isLogin && (

          <>

            <input

              type="text"

              placeholder="Фамилия"

              value={lastName}

              onChange={(e) => setLastName(e.target.value)}

              required

              autoComplete="family-name"

            />

            <input

              type="text"

              placeholder="Имя"

              value={firstName}

              onChange={(e) => setFirstName(e.target.value)}

              required

              autoComplete="given-name"

            />

            <input

              type="text"

              placeholder="Отчество"

              value={patronymic}

              onChange={(e) => setPatronymic(e.target.value)}

              autoComplete="additional-name"

            />

            <input

              type="tel"

              placeholder="Телефон"

              value={phone}

              onChange={(e) => setPhone(formatRussianPhone(e.target.value))}

              pattern="[+]?[0-9\s\-()]+"

              required

              autoComplete="tel"

            />

          </>

        )}

        {!isLogin && (

          <PersonalDataConsentCheckbox

            id="register-pd-consent"

            checked={pdConsent}

            onChange={(value) => {

              setPdConsent(value);

              if (value) setPdConsentError('');

            }}

            error={pdConsentError}

          />

        )}

        <button type="submit" className="btn btn--large" disabled={isBusy}>

          {isBusy ? 'Подождите...' : isLogin ? 'Войти' : 'Зарегистрироваться'}

        </button>

      </form>

      <button onClick={toggleMode} className="btn-outline" style={{ marginTop: '1rem' }}>

        {isLogin ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войдите'}

      </button>

    </div>

  );

};



export default Auth;

