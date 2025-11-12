import React, { useState } from 'react';
import { formatRussianPhone } from '../utils/phone';

const Auth = ({ onLogin, onRegister }) => {
  const [isLogin, setIsLogin] = useState(true); // true - вход, false - регистрация
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [patronymic, setPatronymic] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLogin) {
      // Логика входа
      const user = localStorage.getItem(email);
      if (user && JSON.parse(user).password === password) {
        onLogin(JSON.parse(user));
      } else {
        alert('Неверный email или пароль');
      }
    } else {
      // Логика регистрации
      const formattedPhone = formatRussianPhone(phone);
      const fullName = [lastName, firstName, patronymic].filter(Boolean).join(' ');
      const newUser = {
        email,
        password,
        name: firstName || email.split('@')[0],
        firstName,
        lastName,
        patronymic,
        fullName,
        phone: formattedPhone || null,
        orders: [],
      };
      localStorage.setItem(email, JSON.stringify(newUser));
      onRegister(newUser);
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
  };

  return (
    <div className="auth-section">
      <h2 className="section-title">{isLogin ? 'Вход' : 'Регистрация'}</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
        <button type="submit" className="btn btn--large">
          {isLogin ? 'Войти' : 'Зарегистрироваться'}
        </button>
      </form>
      <button onClick={toggleMode} className="btn-outline" style={{ marginTop: '1rem' }}>
        {isLogin ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войдите'}
      </button>
    </div>
  );
};

export default Auth;