import { useState } from "react";
import { useSocket } from "../context/SocketContext";
import API from "../api/axios";

const MessageInput = ({ roomId, users = [], onSelectChat }) => {
    const [content, setContent] = useState("");
    const { socket } = useSocket();

    const handleSend = async (e) => {
        e.preventDefault();
        if (!content.trim() || !socket) return;

        // --- @mention: detect "@username message" pattern ---
        const mentionMatch = content.match(/^@(\S+)\s+([\s\S]+)$/);
        if (mentionMatch) {
            const mentionedName = mentionMatch[1].toLowerCase();
            const actualMessage = mentionMatch[2].trim();

            // Find user whose name starts with the @mention (case-insensitive)
            const targetUser = users.find(
                (u) => u.name.toLowerCase() === mentionedName ||
                    u.name.toLowerCase().startsWith(mentionedName)
            );

            if (targetUser) {
                try {
                    // Create or get existing DM room with that user
                    const { data: dmRoom } = await API.post("/rooms", { memberId: targetUser._id });
                    // Switch chat window to that DM
                    onSelectChat(dmRoom);
                    // Send the message in the DM room
                    socket.emit("send_message", { roomId: dmRoom._id, content: actualMessage });
                    setContent("");
                    socket.emit("stop_typing", { roomId });
                    return;
                } catch (err) {
                    console.error("@mention DM failed", err);
                }
            }
        }

        // Normal message send
        socket.emit("send_message", { roomId, content });
        setContent("");
        socket.emit("stop_typing", { roomId });
    };

    const handleTyping = (e) => {
        setContent(e.target.value);
        if (socket) {
            socket.emit("typing", { roomId });
            setTimeout(() => {
                socket.emit("stop_typing", { roomId });
            }, 2000);
        }
    };

    return (
        <div className="message-input-container">
            <form onSubmit={handleSend} className="message-form">
                <input
                    type="text"
                    value={content}
                    onChange={handleTyping}
                    placeholder="Type a message... (@name msg for DM, @bot for AI)"
                    className="message-input"
                />
                <button type="submit" className="send-button" disabled={!content.trim()}>
                    ➤
                </button>
            </form>
        </div>
    );
};

export default MessageInput;
