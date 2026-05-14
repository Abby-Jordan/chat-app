import express from "express";
import { createRoom, getUserRooms, getMessages, createGroupChat, clearChat } from "../controllers/roomController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/", protect, createRoom);
router.post("/group", protect, createGroupChat);
router.get("/", protect, getUserRooms);
router.get("/:roomId/messages", protect, getMessages);
router.delete("/:roomId/messages", protect, clearChat);

export default router;
