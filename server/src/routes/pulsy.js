import { Router } from "express";
import db from "../database/db.js";
import { auth } from "../middleware/auth.js";
const router = Router();
export const PULSY_EMOTES = [{
  id: "peepoFlower",
  name: "peepoFlower",
  label: "PEEPOFLOWER",
  price: 20,
  imageUrl: "/emotes/peepoFlower-3x.webp"
}, {
  id: "EZY",
  name: "EZY",
  label: "EZY",
  price: 20,
  imageUrl: "/emotes/EZY-3x.webp"
}, {
  id: "pepeSadJam",
  name: "pepeSadJam",
  label: "PEPESADJAM",
  price: 20,
  imageUrl: "/emotes/pepeSadJam-3x.webp"
}, {
  id: "DonoWall",
  name: "DonoWall",
  label: "DONOWALL",
  price: 20,
  imageUrl: "/emotes/donowall-3x.webp"
}, {
  id: "KEKW",
  name: "KEKW",
  label: "KEKW",
  price: 20,
  imageUrl: "/emotes/KEKW-3x.webp"
}, {
  id: "catJAM",
  name: "catJAM",
  label: "CATJAM",
  price: 20,
  imageUrl: "/emotes/catJAM-3x.webp"
}, {
  id: "monkaHmm",
  name: "monkaHmm",
  label: "MONKAHMM",
  price: 20,
  imageUrl: "/emotes/monkaHmm-3x.webp"
}, {
  id: "ALO",
  name: "ALO",
  label: "ALO",
  price: 20,
  imageUrl: "/emotes/ALO-3x.webp"
}];
export const PULSY_BORDERS = [{
  id: "aurora",
  name: "Aurora",
  price: 20,
  description: "Cool northern-light RGB"
}, {
  id: "cyber",
  name: "Cyber",
  price: 20,
  description: "Electric cyan + violet"
}, {
  id: "synthwave",
  name: "Synthwave",
  price: 20,
  description: "Pink + purple arcade glow"
}, {
  id: "ocean",
  name: "Ocean",
  price: 20,
  description: "Aqua + blue current"
}, {
  id: "sunset",
  name: "Sunset",
  price: 20,
  description: "Warm orange + magenta"
}, {
  id: "plasma",
  name: "Plasma",
  price: 20,
  description: "Hot violet + blue plasma"
}, {
  id: "rainbow",
  name: "Rainbow",
  price: 20,
  description: "Full-spectrum RGB"
}, {
  id: "electric",
  name: "Electric",
  price: 20,
  description: "Blue + white lightning"
}, {
  id: "fireice",
  name: "Fire & Ice",
  price: 20,
  description: "Icy blue meets ember red"
}, {
  id: "neon",
  name: "Neon",
  price: 20,
  description: "Classic neon RGB"
}];
function getBalance(userId) {
  return db.prepare("SELECT pulsy_balance, message_count, pulsy_rewarded_milestones FROM users WHERE id = ?").get(userId);
}
router.get("/", auth, (req, res) => {
  const user = db.prepare("SELECT pulsy_balance, message_count, profile_border_id FROM users WHERE id = ?").get(req.user.id);
  const owned = db.prepare("SELECT emote_id FROM pulsy_inventory WHERE user_id = ?").all(req.user.id).map(row => row.emote_id);
  const ownedBorders = db.prepare("SELECT border_id FROM pulsy_border_inventory WHERE user_id = ?").all(req.user.id).map(row => row.border_id);
  res.json({
    balance: Number(user?.pulsy_balance || 0),
    messageCount: Number(user?.message_count || 0),
    profileBorderId: user?.profile_border_id || null,
    owned,
    ownedBorders,
    emotes: PULSY_EMOTES,
    borders: PULSY_BORDERS
  });
});
router.post("/:emoteId/buy", auth, (req, res) => {
  const emote = PULSY_EMOTES.find(item => item.id === req.params.emoteId);
  if (!emote) return res.status(404).json({
    message: "Emote not found"
  });
  const user = getBalance(req.user.id);
  if (!user) return res.status(404).json({
    message: "User not found"
  });
  const owned = db.prepare("SELECT 1 FROM pulsy_inventory WHERE user_id = ? AND emote_id = ?").get(req.user.id, emote.id);
  if (owned) return res.status(409).json({
    message: "You already own this emote"
  });
  if (Number(user.pulsy_balance) < emote.price) return res.status(400).json({
    message: `You need ${emote.price} Pulsy to buy this emote.`
  });
  db.prepare("UPDATE users SET pulsy_balance = pulsy_balance - ? WHERE id = ?").run(emote.price, req.user.id);
  db.prepare("INSERT INTO pulsy_inventory(user_id, emote_id) VALUES(?, ?)").run(req.user.id, emote.id);
  const updated = getBalance(req.user.id);
  res.json({
    balance: Number(updated.pulsy_balance),
    owned: [...db.prepare("SELECT emote_id FROM pulsy_inventory WHERE user_id = ?").all(req.user.id).map(row => row.emote_id)]
  });
});
export default router;
router.post("/borders/:borderId/buy", auth, (req, res) => {
  const border = PULSY_BORDERS.find(item => item.id === req.params.borderId);
  if (!border) return res.status(404).json({
    message: "Profile border not found"
  });
  const user = getBalance(req.user.id);
  if (!user) return res.status(404).json({
    message: "User not found"
  });
  const owned = db.prepare("SELECT 1 FROM pulsy_border_inventory WHERE user_id = ? AND border_id = ?").get(req.user.id, border.id);
  if (owned) return res.status(409).json({
    message: "You already own this border"
  });
  if (Number(user.pulsy_balance) < border.price) return res.status(400).json({
    message: `You need ${border.price} Pulsy to buy this border.`
  });
  db.prepare("UPDATE users SET pulsy_balance = pulsy_balance - ?, profile_border_id = ? WHERE id = ?").run(border.price, border.id, req.user.id);
  db.prepare("INSERT INTO pulsy_border_inventory(user_id, border_id) VALUES(?, ?)").run(req.user.id, border.id);
  const ownedBorders = db.prepare("SELECT border_id FROM pulsy_border_inventory WHERE user_id = ?").all(req.user.id).map(row => row.border_id);
  const updated = getBalance(req.user.id);
  res.json({
    balance: Number(updated.pulsy_balance),
    ownedBorders,
    profileBorderId: border.id
  });
});
router.post("/borders/:borderId/equip", auth, (req, res) => {
  const borderId = String(req.params.borderId);
  const border = PULSY_BORDERS.find(item => item.id === borderId);
  if (!border) return res.status(404).json({
    message: "Profile border not found"
  });
  const owned = db.prepare("SELECT 1 FROM pulsy_border_inventory WHERE user_id = ? AND border_id = ?").get(req.user.id, borderId);
  if (!owned) return res.status(403).json({
    message: "Buy this border in the Pulsy shop first."
  });
  db.prepare("UPDATE users SET profile_border_id = ? WHERE id = ?").run(borderId, req.user.id);
  const user = db.prepare("SELECT id, username, avatar, role, profile_border_id FROM users WHERE id = ?").get(req.user.id);
  req.app.get("io")?.emit("user:profile_updated", user);
  res.json({
    profileBorderId: borderId,
    user
  });
});
router.post("/borders/none/equip", auth, (req, res) => {
  db.prepare("UPDATE users SET profile_border_id = NULL WHERE id = ?").run(req.user.id);
  const user = db.prepare("SELECT id, username, avatar, role, profile_border_id FROM users WHERE id = ?").get(req.user.id);
  req.app.get("io")?.emit("user:profile_updated", user);
  res.json({
    profileBorderId: null,
    user
  });
});
