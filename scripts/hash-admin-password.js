const crypto = require('crypto');

const password = process.argv[2];
if (!password) {
  console.error('Использование: npm run admin:hash-password -- "ВашПароль"');
  process.exit(1);
}
if (password.length < 8) {
  console.error('Пароль должен быть не короче 8 символов.');
  process.exit(1);
}

const salt = crypto.randomBytes(16).toString('base64url');
const digest = crypto.scryptSync(password, salt, 64).toString('hex');
console.log(`${salt}:${digest}`);
