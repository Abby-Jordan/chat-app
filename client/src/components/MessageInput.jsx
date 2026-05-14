import { useState } from "react";
import { useSocket } from "../context/SocketContext";

const MessageInput = ({ roomId }) => {
    const [content, setContent] = useState("");
    const { socket } = useSocket();

    const handleSend = (e) => {
        e.preventDefault();
        if (!content.trim() || !socket) return;

        socket.emit("send_message", { roomId, content });
        setContent("");
        socket.emit("stop_typing", { roomId });
    };

    const handleTyping = (e) => {
        setContent(e.target.value);
        if (socket) {
            socket.emit("typing", { roomId });

            // Clear typing indicator after brief pause
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
                    placeholder="Type a message... (use @bot for AI)"
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
