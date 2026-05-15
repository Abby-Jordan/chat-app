import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${unique}${path.extname(file.originalname)}`);
    },
});

const fileFilter = (req, file, cb) => {
    // Allow images, videos, audio, docs
    const allowed = [
        "image/", "video/", "audio/",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain",
        "application/zip",
    ];
    const ok = allowed.some(type => file.mimetype.startsWith(type) || file.mimetype === type);
    if (ok) cb(null, true);
    else cb(new Error("File type not allowed"), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 25 * 1024 * 1024 } }); // 25 MB

// Helper: determine display type
const getFileType = (mimetype) => {
    if (mimetype.startsWith("image/")) return "image";
    if (mimetype.startsWith("video/")) return "video";
    if (mimetype.startsWith("audio/")) return "audio";
    return "document";
};

// POST /api/upload
router.post("/", protect, upload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

    res.status(200).json({
        fileUrl,
        fileName: req.file.originalname,
        fileType: getFileType(req.file.mimetype),
        fileSize: req.file.size,
    });
});

export default router;
