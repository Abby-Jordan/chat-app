import Room from "../models/Room.js";
import Message from "../models/Message.js";

export const createRoom = async (req, res) => {
    try {
        const { memberId } = req.body;
        if (!memberId) return res.status(400).json({ message: "Member ID required" });

        const existingRoom = await Room.findOne({
            isGroupChat: false,
            members: { $all: [req.user.id, memberId] }
        });

        if (existingRoom) {
            return res.status(200).json(existingRoom);
        }

        const newRoom = await Room.create({
            isGroupChat: false,
            members: [req.user.id, memberId]
        });

        const populatedRoom = await Room.findById(newRoom._id).populate("members", "-password");

        res.status(201).json(populatedRoom);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createGroupChat = async (req, res) => {
    try {
        const { name, members } = req.body;
        if (!name || !members || members.length === 0) {
            return res.status(400).json({ message: "Please fill all fields and add members" });
        }

        members.push(req.user.id);

        const groupRoom = await Room.create({
            name,
            isGroupChat: true,
            members,
            admin: req.user.id
        });

        const populatedRoom = await Room.findById(groupRoom._id).populate("members", "-password");
        res.status(201).json(populatedRoom);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getUserRooms = async (req, res) => {
    try {
        const rooms = await Room.find({ members: { $in: [req.user.id] } })
            .populate("members", "-password")
            .populate("lastMessages")
            .sort({ updatedAt: -1 });

        // Filter out null members (users who were deleted from the DB)
        const cleanedRooms = rooms.map(room => {
            const roomObj = room.toObject();
            roomObj.members = roomObj.members.filter(m => m !== null);
            return roomObj;
        });

        res.status(200).json(cleanedRooms);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getMessages = async (req, res) => {
    try {
        const { roomId } = req.params;
        const messages = await Message.find({ room: roomId })
            .populate("sender", "name email avatar")
            .sort({ createdAt: 1 });

        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const clearChat = async (req, res) => {
    try {
        const { roomId } = req.params;
        const room = await Room.findById(roomId);
        if (!room) return res.status(404).json({ message: "Room not found" });
        if (!room.members.includes(req.user.id)) return res.status(403).json({ message: "Not a member" });

        await Message.deleteMany({ room: roomId });
        res.status(200).json({ message: "Chat cleared successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
