import { useState } from "react";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import { useAuth } from "../context/AuthContext";

const Chat = () => {
    const [selectedRoom, setSelectedRoom] = useState(null);
    const { user } = useAuth();

    // Find the other user's info or group info
    const getChatDetails = (room) => {
        if (!room) return null;
        if (room.isGroupChat) {
            return { name: room.name, isGroup: true };
        }
        if (!room.members || !user) return null;

        const otherUser = room.members.find((m) => {
            if (!m) return false; // deleted user (null after populate)
            const mId = m._id || m;
            return mId !== user._id;
        });
        return { name: otherUser?.name || "Deleted User", isGroup: false };
    };

    return (
        <div className="chat-page">
            <Sidebar
                onSelectChat={(room) => setSelectedRoom(room)}
                selectedChatId={selectedRoom?._id}
            />
            <ChatWindow
                room={selectedRoom}
                chatDetails={getChatDetails(selectedRoom)}
            />
        </div>
    );
};

export default Chat;
