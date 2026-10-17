import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import db from "../database/db.js";
import { auth } from "../middleware/auth.js";
const router = Router();
const avatarDir = path.resolve(process.env.UPLOAD_DIR || "./uploads", "avatars");
fs.mkdirSync(avatarDir, {
  recursive: true
});
const avatarStorage = multer.diskStorage({
  destination: avatarDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar-${req.user.id}-${Date.now()}${ext}`);
  }
});
const avatarUpload = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  }
});
router.get("/", auth, (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) {
    return res.json({
      users: []
    });
  }
  const users = db.prepare(`SELECT id, username, role, avatar, profile_border_id
       FROM users
       WHERE id <> ?
         AND username = ? COLLATE NOCASE
       ORDER BY username COLLATE NOCASE
       LIMIT 20`).all(req.user.id, q);
  res.json({
    users
  });
});
router.get("/:username", auth, (req, res) => {
  const user = db.prepare("SELECT id, username, role, avatar, profile_border_id FROM users WHERE username = ?").get(req.params.username);
  if (!user) {
    return res.status(404).json({
      message: "User not found"
    });
  }
  res.json({
    user
  });
});

// Profile picture is uploaded as a real image file, not a URL.
router.post("/me/avatar", auth, (req, res) => {
  avatarUpload.single("avatar")(req, res, error => {
    if (error) {
      return res.status(400).json({
        message: error.message
      });
    }
    if (!req.file) {
      return res.status(400).json({
        message: "No image selected"
      });
    }
    const avatar = `/uploads/avatars/${req.file.filename}`;
    db.prepare("UPDATE users SET avatar = ? WHERE id = ?").run(avatar, req.user.id);
    const user = db.prepare("SELECT id, username, role, avatar, profile_border_id FROM users WHERE id = ?").get(req.user.id);
    const io = req.app.get("io");
    io?.emit("user:avatar_changed", user);
    res.json({
      user
    });
  });
});
router.patch("/me/username", auth, async (req, res) => {
  const username = String(req.body.username || "").trim();
  if (!/^[A-Za-z0-9_\.]{3,24}$/.test(username)) {
    return res.status(400).json({
      message: "Username must be 3-24 characters and use letters, numbers, _ or ."
    });
  }
  const existing = db.prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE AND id <> ?").get(username, req.user.id);
  if (existing) return res.status(409).json({
    message: "Username is already taken"
  });
  try {
    db.prepare("UPDATE users SET username = ? WHERE id = ?").run(username, req.user.id);
  } catch {
    return res.status(409).json({
      message: "Username is already taken"
    });
  }
  const user = db.prepare("SELECT id, username, role, avatar, profile_border_id, pulsy_balance, message_count FROM users WHERE id = ?").get(req.user.id);
  const token = (await import("../middleware/auth.js")).sign(user);
  req.app.get("io")?.emit("user:profile_updated", user);
  res.json({
    user,
    token
  });
});
export default router;
