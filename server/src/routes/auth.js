import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../database/db.js';
import { sign, auth } from '../middleware/auth.js';
const router = Router();
router.post('/register', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  if (!/^[A-Za-z0-9_\.]{3,24}$/.test(username)) {
    return res.status(400).json({
      message: 'Username must be 3-24 characters and use letters, numbers, _ or .'
    });
  }
  if (password.length < 6) {
    return res.status(400).json({
      message: 'Password must be at least 6 characters'
    });
  }
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = db.prepare('INSERT INTO users(username, password_hash) VALUES(?, ?)').run(username, passwordHash);
    const user = db.prepare(`SELECT id, username, role, avatar, profile_border_id, pulsy_balance, message_count
         FROM users WHERE id = ?`).get(result.lastInsertRowid);
    res.status(201).json({
      token: sign(user),
      user
    });
  } catch {
    res.status(409).json({
      message: 'Username already exists'
    });
  }
});
router.post('/login', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({
      message: 'Invalid username or password'
    });
  }
  const safeUser = {
    id: user.id,
    username: user.username,
    role: user.role,
    avatar: user.avatar,
    profile_border_id: user.profile_border_id,
    pulsy_balance: Number(user.pulsy_balance || 0),
    message_count: Number(user.message_count || 0)
  };
  res.json({
    token: sign(safeUser),
    user: safeUser
  });
});
router.get('/me', auth, (req, res) => {
  const user = db.prepare(`SELECT id, username, role, avatar, profile_border_id, pulsy_balance, message_count
       FROM users WHERE id = ?`).get(req.user.id);
  if (!user) {
    return res.status(404).json({
      message: 'User not found'
    });
  }
  res.json({
    user
  });
});
export default router;
