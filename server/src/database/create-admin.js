import bcrypt from 'bcryptjs';
import readline from 'readline';
import db from './db.js';
const readlineInterface = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
const ask = question => new Promise(resolve => readlineInterface.question(question, resolve));
const username = (await ask('Admin username: ')).trim();
const password = await ask('Admin password: ');
readlineInterface.close();
if (!username || password.length < 6) {
  console.error('Username required and password must be at least 6 characters.');
  process.exit(1);
}
const passwordHash = await bcrypt.hash(password, 12);
try {
  db.prepare('INSERT INTO users(username, password_hash, role) VALUES(?, ?, ?)').run(username, passwordHash, 'admin');
  console.log(`Admin ${username} created.`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
