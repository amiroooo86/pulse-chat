import { Router } from 'express';
import db from '../database/db.js';
import { auth } from '../middleware/auth.js';
const r = Router();
function pair(a, b) {
  return a < b ? [a, b] : [b, a];
}
r.get('/', auth, (req, res) => {
  const rows = db.prepare(`
    SELECT c.id,c.user_a,c.user_b,
           u.id other_id,u.username,u.avatar,u.profile_border_id,
           m.id last_message_id,m.text last_text,m.image_url last_image,m.created_at last_at,
           CASE WHEN cr.user_id IS NULL THEN 0 ELSE (SELECT COUNT(*) FROM messages um
             WHERE um.conversation_id=c.id
               AND um.id > cr.last_read_message_id
               AND um.sender_id <> ?) END unread_count
    FROM conversations c
    JOIN users u ON u.id=CASE WHEN c.user_a=? THEN c.user_b ELSE c.user_a END
    LEFT JOIN messages m ON m.id=(SELECT id FROM messages WHERE conversation_id=c.id ORDER BY id DESC LIMIT 1)
    LEFT JOIN conversation_reads cr ON cr.conversation_id=c.id AND cr.user_id=?
    WHERE c.user_a=? OR c.user_b=?
    ORDER BY COALESCE(m.created_at,c.created_at) DESC
  `).all(req.user.id, req.user.id, req.user.id, req.user.id, req.user.id);
  res.json({
    conversations: rows.map(row => ({
      ...row,
      unread_count: Number(row.unread_count || 0)
    }))
  });
});
r.post('/:id/read', auth, (req, res) => {
  const id = Number(req.params.id);
  const ok = db.prepare('SELECT 1 FROM conversations WHERE id=? AND (user_a=? OR user_b=?)').get(id, req.user.id, req.user.id);
  if (!ok) return res.status(403).json({
    message: 'Not a participant'
  });
  const last = db.prepare('SELECT COALESCE(MAX(id),0) AS id FROM messages WHERE conversation_id=?').get(id);
  db.prepare(`INSERT INTO conversation_reads(conversation_id,user_id,last_read_message_id) VALUES(?,?,?)
    ON CONFLICT(conversation_id,user_id) DO UPDATE SET last_read_message_id=excluded.last_read_message_id`).run(id, req.user.id, Number(last?.id || 0));
  res.json({
    conversationId: id,
    lastReadMessageId: Number(last?.id || 0)
  });
});
r.post('/', auth, (req, res) => {
  const other = Number(req.body.userId);
  if (!other || other === req.user.id) return res.status(400).json({
    message: 'Invalid user'
  });
  const [a, b] = pair(req.user.id, other);
  db.prepare('INSERT OR IGNORE INTO conversations(user_a,user_b) VALUES(?,?)').run(a, b);
  const c = db.prepare('SELECT * FROM conversations WHERE user_a=? AND user_b=?').get(a, b);
  res.json({
    conversation: c
  });
});
export default r;
