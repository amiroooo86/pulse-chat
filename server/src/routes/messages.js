import { Router } from "express";
import db from "../database/db.js";
import { auth } from "../middleware/auth.js";
const router = Router();
const PULSY_EMOTE_IDS = new Set(["peepoFlower", "EZY", "pepeSadJam", "DonoWall", "KEKW", "catJAM", "monkaHmm", "ALO"]);
function applyPulsyReward(userId) {
  const user = db.prepare("SELECT message_count, pulsy_balance, pulsy_rewarded_milestones FROM users WHERE id = ?").get(userId);
  if (!user) return null;
  const count = Number(user.message_count || 0) + 1;
  const milestones = Math.floor(count / 200);
  const rewarded = Number(user.pulsy_rewarded_milestones || 0);
  const newlyEarned = Math.max(0, milestones - rewarded);
  const balance = Number(user.pulsy_balance || 0) + newlyEarned * 10;
  db.prepare("UPDATE users SET message_count = ?, pulsy_rewarded_milestones = ?, pulsy_balance = ? WHERE id = ?").run(count, milestones, balance, userId);
  return {
    balance,
    messageCount: count,
    reward: newlyEarned * 10
  };
}
function hydrate(rows, uid) {
  if (!rows.length) return rows;

  // Fetch reactions for the whole message page in one query instead of one
  // query per message. This keeps chat history fast as the message count grows.
  const ids = rows.map(message => Number(message.id));
  const placeholders = ids.map(() => "?").join(",");
  const reactionRows = db.prepare(`SELECT message_id, reaction,
              COUNT(*) AS count,
              SUM(CASE WHEN user_id = ? THEN 1 ELSE 0 END) AS mine
       FROM message_reactions
       WHERE message_id IN (${placeholders})
       GROUP BY message_id, reaction`).all(uid, ...ids);
  const reactionsByMessage = new Map();
  for (const reaction of reactionRows) {
    const list = reactionsByMessage.get(Number(reaction.message_id)) || [];
    list.push(reaction);
    reactionsByMessage.set(Number(reaction.message_id), list);
  }
  return rows.map(message => ({
    ...message,
    reactions: reactionsByMessage.get(Number(message.id)) || []
  }));
}
function getMessage(id, uid = null) {
  const message = db.prepare(`SELECT m.*, u.username, u.avatar, u.profile_border_id,
              rm.text AS reply_text,
              rm.image_url AS reply_image_url,
              ru.id AS reply_user_id,
              ru.username AS reply_username
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       LEFT JOIN messages rm ON rm.id = m.reply_to
       LEFT JOIN users ru ON ru.id = rm.sender_id
       WHERE m.id = ?`).get(id);
  if (!message) return null;
  return {
    ...message,
    reactions: uid == null ? [] : hydrate([message], uid)[0].reactions
  };
}
function emitMessage(req, message) {
  const io = req.app.get("io");
  if (!io) return;
  let userIds = [];
  if (message.group_id) {
    userIds = db.prepare("SELECT user_id FROM group_members WHERE group_id = ?").all(message.group_id).map(row => row.user_id);
  } else if (message.conversation_id) {
    userIds = db.prepare("SELECT user_a AS user_id FROM conversations WHERE id = ? UNION SELECT user_b AS user_id FROM conversations WHERE id = ?").all(message.conversation_id, message.conversation_id).map(row => row.user_id);
  }
  for (const userId of userIds) {
    io.to(`user:${userId}`).emit("message:new", message);
  }
}
router.get("/", auth, (req, res) => {
  const groupId = req.query.groupId ? Number(req.query.groupId) : null;
  const conversationId = req.query.conversationId ? Number(req.query.conversationId) : null;
  if (groupId) {
    const ok = db.prepare("SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?").get(groupId, req.user.id);
    if (!ok) return res.status(403).json({
      message: "Not a member"
    });
  }
  if (conversationId) {
    const ok = db.prepare("SELECT 1 FROM conversations WHERE id = ? AND (user_a = ? OR user_b = ?)").get(conversationId, req.user.id, req.user.id);
    if (!ok) return res.status(403).json({
      message: "Not a participant"
    });
  }
  if (!groupId && !conversationId || groupId && conversationId) {
    return res.status(400).json({
      message: "Invalid conversation"
    });
  }
  const rows = db.prepare(`SELECT m.*, u.username, u.avatar, u.profile_border_id,
              rm.text AS reply_text,
              rm.image_url AS reply_image_url,
              ru.id AS reply_user_id,
              ru.username AS reply_username
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       LEFT JOIN messages rm ON rm.id = m.reply_to
       LEFT JOIN users ru ON ru.id = rm.sender_id
       WHERE ${groupId ? "m.group_id = ?" : "m.conversation_id = ?"}
       ORDER BY m.id DESC
       LIMIT 100`).all(groupId || conversationId);
  res.json({
    messages: hydrate(rows.reverse(), req.user.id)
  });
});
router.post("/", auth, (req, res) => {
  const groupId = req.body.groupId ? Number(req.body.groupId) : null;
  const conversationId = req.body.conversationId ? Number(req.body.conversationId) : null;
  const text = String(req.body.text || "").trim();
  const imageUrl = req.body.imageUrl ? String(req.body.imageUrl) : null;
  const replyTo = req.body.replyTo ? Number(req.body.replyTo) : null;
  const emoteId = req.body.emoteId ? String(req.body.emoteId) : null;
  if (!groupId && !conversationId || groupId && conversationId || !text && !imageUrl && !emoteId) {
    return res.status(400).json({
      message: "Invalid message"
    });
  }
  if (groupId && !db.prepare("SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?").get(groupId, req.user.id)) {
    return res.status(403).json({
      message: "Not a member"
    });
  }
  if (conversationId && !db.prepare("SELECT 1 FROM conversations WHERE id = ? AND (user_a = ? OR user_b = ?)").get(conversationId, req.user.id, req.user.id)) {
    return res.status(403).json({
      message: "Not a participant"
    });
  }
  if (replyTo) {
    const replyMessage = db.prepare("SELECT id, group_id, conversation_id FROM messages WHERE id = ?").get(replyTo);
    if (!replyMessage) {
      return res.status(400).json({
        message: "Reply target does not exist"
      });
    }
    const sameConversation = groupId ? replyMessage.group_id === groupId : replyMessage.conversation_id === conversationId;
    if (!sameConversation) {
      return res.status(400).json({
        message: "Invalid reply target"
      });
    }
  }
  if (emoteId && (!PULSY_EMOTE_IDS.has(emoteId) || imageUrl || text)) {
    return res.status(400).json({
      message: "Invalid emote message"
    });
  }
  if (emoteId && !db.prepare("SELECT 1 FROM pulsy_inventory WHERE user_id = ? AND emote_id = ?").get(req.user.id, emoteId)) {
    return res.status(403).json({
      message: "Buy this emote in the Pulsy shop first."
    });
  }
  const type = emoteId ? "emote" : imageUrl ? "image" : "text";
  const info = db.prepare(`INSERT INTO messages(
        group_id,
        conversation_id,
        sender_id,
        text,
        image_url,
        reply_to,
        message_type,
        emote_id
      ) VALUES(?, ?, ?, ?, ?, ?, ?, ?)`).run(groupId, conversationId, req.user.id, text || null, imageUrl, replyTo, type, emoteId);
  const pulsy = applyPulsyReward(req.user.id);
  const message = getMessage(info.lastInsertRowid, req.user.id);
  emitMessage(req, message);
  res.status(201).json({
    message,
    pulsy
  });
});
router.post("/:id/reaction", auth, (req, res) => {
  const id = Number(req.params.id);
  const reaction = String(req.body.reaction || "").trim();
  if (!reaction || reaction.length > 8) {
    return res.status(400).json({
      message: "Invalid reaction"
    });
  }
  const message = db.prepare(`SELECT m.id, m.group_id, m.conversation_id
       FROM messages m
       WHERE m.id = ?`).get(id);
  if (!message) {
    return res.status(404).json({
      message: "Message not found"
    });
  }
  if (message.group_id) {
    const member = db.prepare("SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?").get(message.group_id, req.user.id);
    if (!member) return res.status(403).json({
      message: "Not a member"
    });
  } else {
    const participant = db.prepare("SELECT 1 FROM conversations WHERE id = ? AND (user_a = ? OR user_b = ?)").get(message.conversation_id, req.user.id, req.user.id);
    if (!participant) {
      return res.status(403).json({
        message: "Not a participant"
      });
    }
  }
  const existing = db.prepare("SELECT reaction FROM message_reactions WHERE message_id = ? AND user_id = ?").get(id, req.user.id);
  if (existing?.reaction === reaction) {
    db.prepare("DELETE FROM message_reactions WHERE message_id = ? AND user_id = ?").run(id, req.user.id);
  } else {
    db.prepare(`INSERT INTO message_reactions(message_id, user_id, reaction)
       VALUES(?, ?, ?)
       ON CONFLICT(message_id, user_id)
       DO UPDATE SET reaction = excluded.reaction`).run(id, req.user.id, reaction);
  }
  const reactions = db.prepare("SELECT reaction, COUNT(*) AS count FROM message_reactions WHERE message_id = ? GROUP BY reaction").all(id);
  const io = req.app.get("io");
  if (message.group_id) {
    io?.to(`group:${message.group_id}`).emit("reaction:update", {
      messageId: id,
      reactions
    });
  } else {
    io?.to(`conversation:${message.conversation_id}`).emit("reaction:update", {
      messageId: id,
      reactions
    });
  }
  res.json({
    reactions
  });
});
export default router;
