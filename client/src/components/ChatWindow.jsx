import { useEffect, useState, useRef } from "react";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import { useSocket } from "../context/SocketContext";
import API from "../api/axios";

const ChatWindow = ({ room, chatDetails, users, onSelectChat }) => {
    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [typingUser, setTypingUser] = useState("");
    const { socket } = useSocket();
    const messagesEndRef = useRef(null);

    useEffect(() => {
        const fetchMessages = async () => {
            try {
                const { data } = await API.get(`/rooms/${room._id}/messages`);
                setMessages(data);
                scrollToBottom();
            } catch (error) {
                console.error("Failed to load messages", error);
            }
        };

        if (room) {
            fetchMessages();
        }
    }, [room]);

    useEffect(() => {
        if (!socket || !room) return;

        socket.emit("join_room", room._id);

        const handleNewMessage = (newMessage) => {
            setMessages((prev) => [...prev, newMessage]);
            scrollToBottom();
        };

        const handleUserTyping = ({ name }) => {
            setIsTyping(true);
            setTypingUser(name);
        };

        const handleStopTyping = () => {
            setIsTyping(false);
            setTypingUser("");
        };

        const handleBotTyping = (isBotTyping) => {
            setIsTyping(isBotTyping);
            setTypingUser(isBotTyping ? "AI Bot" : "");
        };

        socket.on("receive_message", handleNewMessage);
        socket.on("user_typing", handleUserTyping);
        socket.on("user_stop_typing", handleStopTyping);
        socket.on("bot_typing", handleBotTyping);

        return () => {
            socket.off("receive_message", handleNewMessage);
            socket.off("user_typing", handleUserTyping);
            socket.off("user_stop_typing", handleStopTyping);
            socket.off("bot_typing", handleBotTyping);
            socket.emit("leave_room", room._id);
        };
    }, [socket, room]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    const clearChat = async () => {
        if (!window.confirm("Are you sure you want to clear this chat? This action cannot be undone.")) return;
        try {
            await API.delete(`/rooms/${room._id}/messages`);
            setMessages([]);
        } catch (error) {
            console.error("Failed to clear chat", error);
        }
    };

    if (!room) {
        return (
            <div className="chat-empty">
                <h3>Welcome to WebChat ✨</h3>
                <p>Select a user to start chatting</p>
            </div>
        );
    }

    return (
        <div className="chat-area">
            <div className="chat-header" style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                    <div className="user-avatar" style={chatDetails?.isGroup ? { backgroundColor: "#14b8a6", marginRight: "1rem" } : { marginRight: "1rem" }}>
                        {chatDetails?.isGroup ? "G" : (chatDetails?.name?.[0]?.toUpperCase() || "C")}
                    </div>
                    <div>
                        <h3>{chatDetails ? chatDetails.name : "Chat"}</h3>
                    </div>
                </div>
                <button
                    onClick={clearChat}
                    style={{ background: "none", border: "none", color: "var(--error-color)", cursor: "pointer", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem" }}
                    title="Clear Chat"
                >
                    🗑️ Clear
                </button>
            </div>

            <div className="chat-messages">
                {messages.length === 0 ? (
                    <div style={{ textAlign: "center", color: "var(--text-muted)", marginTop: "2rem" }}>No messages here yet. Start the conversation!</div>
                ) : (
                    messages.map((msg, index) => (
                        <MessageBubble key={msg._id || index} message={msg} />
                    ))
                )}

                {isTyping && (
                    <div className="typing-indicator">
                        {typingUser} is typing...
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <MessageInput roomId={room._id} users={users} onSelectChat={onSelectChat} />
        </div>
    );
};

export default ChatWindow;