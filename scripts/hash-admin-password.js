const bcrypt = require('bcryptjs');

const password = process.argv[2];
if (!password) {
  console.error('Использование: npm run admin:hash-password -- "ВашПароль"');
  process.exit(1);
}
if (password.length < 12) {
  console.error('Пароль администратора должен быть не короче 12 символов.');
  process.exit(1);
}

console.log(bcrypt.hashSync(password, 12));
