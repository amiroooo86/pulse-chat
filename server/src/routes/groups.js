import { Router } from "express";
import db from "../database/db.js";
import { auth } from "../middleware/auth.js";
const router = Router();
function getGroup(groupId) {
  return db.prepare(`SELECT g.id, g.name, g.avatar, g.description, g.owner_id, COUNT(gm.user_id) AS members
       FROM groups g
       LEFT JOIN group_members gm ON gm.group_id = g.id
       WHERE g.id = ?
       GROUP BY g.id`).get(groupId);
}
function isMember(groupId, userId) {
  return !!db.prepare("SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?").get(groupId, userId);
}
router.get("/", auth, (req, res) => {
  const groups = db.prepare(`SELECT g.id, g.name, g.avatar, g.description, g.owner_id, COUNT(all_members.user_id) AS members
       FROM groups g
       JOIN group_members mine
         ON mine.group_id = g.id AND mine.user_id = ?
       LEFT JOIN group_members all_members
         ON all_members.group_id = g.id
       GROUP BY g.id
       ORDER BY g.name COLLATE NOCASE`).all(req.user.id);
  res.json({
    groups
  });
});

// Every authenticated user can create a group.
router.post("/", auth, (req, res) => {
  const name = String(req.body.name || "").trim();
  if (name.length < 2 || name.length > 50) {
    return res.status(400).json({
      message: "Group name must be 2-50 characters"
    });
  }
  try {
    const info = db.prepare("INSERT INTO groups(name, owner_id, description) VALUES(?, ?, ?)").run(name, req.user.id, "");
    const groupId = info.lastInsertRowid;

    // Creator is automatically a member.
    db.prepare("INSERT INTO group_members(group_id, user_id) VALUES(?, ?)").run(groupId, req.user.id);
    const group = getGroup(groupId);
    const io = req.app.get("io");
    io?.to(`user:${req.user.id}`).emit("group:added", group);
    res.status(201).json({
      group
    });
  } catch {
    res.status(409).json({
      message: "A group with this name already exists"
    });
  }
});

// Only the group owner (group admin) can edit group settings.
router.patch("/:id/settings", auth, (req, res) => {
  const groupId = Number(req.params.id);
  const group = db.prepare("SELECT id, name, avatar, description, owner_id FROM groups WHERE id = ?").get(groupId);
  if (!group) {
    return res.status(404).json({
      message: "Group not found"
    });
  }
  if (Number(group.owner_id) !== Number(req.user.id)) {
    return res.status(403).json({
      message: "Only the group admin can edit group settings"
    });
  }
  const name = String(req.body.name ?? group.name).trim();
  const description = String(req.body.description ?? group.description ?? "").trim();
  const avatar = req.body.avatar === undefined ? group.avatar : req.body.avatar || null;
  if (name.length < 2 || name.length > 50) {
    return res.status(400).json({
      message: "Group name must be 2-50 characters"
    });
  }
  if (description.length > 300) {
    return res.status(400).json({
      message: "Group description must be 300 characters or less"
    });
  }
  try {
    db.prepare("UPDATE groups SET name = ?, avatar = ?, description = ? WHERE id = ?").run(name, avatar, description, groupId);
  } catch {
    return res.status(409).json({
      message: "A group with this name already exists"
    });
  }
  const updated = getGroup(groupId);
  const io = req.app.get("io");
  io?.to(`group:${groupId}`).emit("group:updated", updated);

  // Keep the updated group visible to every member even if they are not
  // currently inside the Socket.IO group room.
  const members = db.prepare("SELECT user_id FROM group_members WHERE group_id = ?").all(groupId);
  for (const member of members) {
    io?.to(`user:${member.user_id}`).emit("group:updated", updated);
  }
  res.json({
    group: updated
  });
});

// Any member can add any existing user.
router.post("/:id/members/:userId", auth, (req, res) => {
  const groupId = Number(req.params.id);
  const userId = Number(req.params.userId);
  if (!isMember(groupId, req.user.id)) {
    return res.status(403).json({
      message: "Only group members can add people"
    });
  }
  const user = db.prepare("SELECT id, username, avatar, role FROM users WHERE id = ?").get(userId);
  if (!user) {
    return res.status(404).json({
      message: "User not found"
    });
  }
  db.prepare("INSERT OR IGNORE INTO group_members(group_id, user_id) VALUES(?, ?)").run(groupId, userId);
  const group = getGroup(groupId);
  const io = req.app.get("io");

  // Immediately show the new group to the invited user.
  io?.to(`user:${userId}`).emit("group:added", group);

  // Refresh group members for everyone currently viewing the group.
  io?.to(`group:${groupId}`).emit("group:members_changed", {
    groupId
  });
  res.json({
    ok: true,
    group
  });
});
router.delete("/:id/members/:userId", auth, (req, res) => {
  const groupId = Number(req.params.id);
  const userId = Number(req.params.userId);
  if (!isMember(groupId, req.user.id)) {
    return res.status(403).json({
      message: "Only group members can remove people"
    });
  }
  if (userId === req.user.id) {
    return res.status(400).json({
      message: "You cannot remove yourself here"
    });
  }
  db.prepare("DELETE FROM group_members WHERE group_id = ? AND user_id = ?").run(groupId, userId);
  res.json({
    ok: true
  });
});
router.get("/:id/members", auth, (req, res) => {
  const groupId = Number(req.params.id);
  if (!isMember(groupId, req.user.id)) {
    return res.status(403).json({
      message: "Not a member"
    });
  }
  const users = db.prepare(`SELECT u.id, u.username, u.avatar, u.profile_border_id, u.role
       FROM users u
       JOIN group_members gm ON gm.user_id = u.id
       WHERE gm.group_id = ?
       ORDER BY u.username COLLATE NOCASE`).all(groupId);
  res.json({
    users
  });
});
export default router;
