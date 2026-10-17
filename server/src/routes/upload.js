import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { auth } from "../middleware/auth.js";
const router = Router();
const dir = path.resolve(process.env.UPLOAD_DIR || "./uploads");
fs.mkdirSync(dir, {
  recursive: true
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1
  },
  fileFilter: (req, file, cb) => {
    cb(null, String(file.mimetype || "").startsWith("image/"));
  }
});
router.post("/", auth, async (req, res) => {
  upload.single("image")(req, res, async error => {
    if (error) {
      return res.status(400).json({
        message: error.message || "Image upload failed"
      });
    }
    if (!req.file) {
      return res.status(400).json({
        message: "Please select an image file."
      });
    }
    const rawExt = path.extname(req.file.originalname || "").toLowerCase();
    const safeExt = /^[.][a-z0-9]{2,5}$/.test(rawExt) ? rawExt : ".img";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${safeExt}`;
    const absolute = path.join(dir, filename);
    try {
      await fs.promises.writeFile(absolute, req.file.buffer);
      res.json({
        url: `/uploads/${filename}`
      });
    } catch (writeError) {
      console.error(writeError);
      res.status(500).json({
        message: "Could not save image"
      });
    }
  });
});
export default router;
