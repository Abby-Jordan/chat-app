import { useState, useEffect } from "react";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";

const Sidebar = ({ onSelectChat, selectedChatId, users, setUsers }) => {
    const { logout, user } = useAuth();
    const { socket } = useSocket();
    const [rooms, setRooms] = useState([]);
    const [showGroupForm, setShowGroupForm] = useState(false);
    const [groupName, setGroupName] = useState("");
    const [selectedMembers, setSelectedMembers] = useState([]);

    // Profile Edit State
    const [showProfileForm, setShowProfileForm] = useState(false);
    const [profileData, setProfileData] = useState({ name: user?.name || "", password: "", avatar: user?.avatar || "" });
    const [isUpdating, setIsUpdating] = useState(false);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setIsUpdating(true);
        try {
            const { data } = await API.put("/auth/me", profileData);
            localStorage.setItem("user", JSON.stringify(data));
            window.location.reload(); // Refresh to update context completely
        } catch (error) {
            console.error("Failed to update profile", error);
            alert("Update check failed");
        } finally {
            setIsUpdating(false);
        }
    };

    useEffect(() => {
        const fetchUsersAndRooms = async () => {
            try {
                const usersRes = await API.get("/auth/users");
                setUsers(usersRes.data);

                const roomsRes = await API.get("/rooms");
                setRooms(roomsRes.data);
            } catch (error) {
                console.error("Failed to load users", error);
            }
        };
        fetchUsersAndRooms();
    }, []);

    // Real-time: add newly registered users instantly (no refresh needed)
    useEffect(() => {
        if (!socket) return;
        const handleNewUser = (newUser) => {
            // Don't add ourselves or duplicates
            setUsers(prev => {
                if (prev.find(u => u._id === newUser._id)) return prev;
                if (newUser._id === user?._id) return prev;
                return [...prev, newUser];
            });
        };
        socket.on('new_user', handleNewUser);
        return () => socket.off('new_user', handleNewUser);
    }, [socket, user]);

    const startChat = async (otherUserId) => {
        try {
            const { data } = await API.post("/rooms", { memberId: otherUserId });
            if (!rooms.find(r => r._id === data._id)) {
                setRooms(prev => [data, ...prev]);
            }
            onSelectChat(data);
        } catch (error) {
            console.error("Error creating room", error);
        }
    };

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        try {
            const { data } = await API.post("/rooms/group", {
                name: groupName,
                members: selectedMembers
            });
            setRooms(prev => [data, ...prev]);
            setShowGroupForm(false);
            setGroupName("");
            setSelectedMembers([]);
            onSelectChat(data);
        } catch (error) {
            console.error("Error creating group", error);
        }
    };

    const toggleMember = (userId) => {
        if (selectedMembers.includes(userId)) {
            setSelectedMembers(prev => prev.filter(id => id !== userId));
        } else {
            setSelectedMembers(prev => [...prev, userId]);
        }
    };

    const getChatName = (room) => {
        if (room.isGroupChat) return room.name;
        const otherUser = room.members.find(m => m && m._id !== user._id);
        return otherUser ? otherUser.name : "Deleted User";
    };

    const isValidRoom = (room) => {
        if (room.isGroupChat) return true;
        // Filter out rooms where the other user has been deleted (null after populate)
        return room.members.some(m => m && m._id !== user._id);
    };

    return (
        <div className="sidebar">
            <div className="sidebar-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", cursor: "pointer" }} onClick={() => setShowProfileForm(!showProfileForm)}>
                    {user?.avatar ? (
                        <img src={user.avatar} alt="Avatar" style={{ width: "35px", height: "35px", borderRadius: "50%", marginRight: "0.75rem", objectFit: "cover" }} />
                    ) : (
                        <div className="user-avatar" style={{ marginRight: "0.75rem", width: "35px", height: "35px" }}>{user?.name?.[0]?.toUpperCase()}</div>
                    )}
                    <h2 style={{ fontSize: "1.1rem" }}>{user?.name} ⚙️</h2>
                </div>
                <button onClick={logout} className="logout-btn">Logout</button>
            </div>

            {showProfileForm && (
                <div style={{ padding: "1rem", backgroundColor: "var(--input-bg)", borderBottom: "1px solid var(--border-color)" }}>
                    <form onSubmit={handleProfileUpdate}>
                        <input type="text" placeholder="New Name" value={profileData.name} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} className="message-input" style={{ width: "100%", marginBottom: "0.5rem" }} />
                        <input type="password" placeholder="New Password" value={profileData.password} onChange={(e) => setProfileData({ ...profileData, password: e.target.value })} className="message-input" style={{ width: "100%", marginBottom: "0.5rem" }} />
                        <input type="text" placeholder="Avatar Image URL (Optional)" value={profileData.avatar} onChange={(e) => setProfileData({ ...profileData, avatar: e.target.value })} className="message-input" style={{ width: "100%", marginBottom: "1rem" }} />

                        <button type="submit" disabled={isUpdating} style={{ width: "100%", padding: "0.5rem", borderRadius: "8px", border: "none", backgroundColor: "var(--primary-color)", color: "white", cursor: "pointer" }}>
                            {isUpdating ? "Saving..." : "Save Profile"}
                        </button>
                    </form>
                </div>
            )}

            <div style={{ padding: "1rem", borderBottom: "1px solid var(--border-color)" }}>
                <button
                    onClick={() => setShowGroupForm(!showGroupForm)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "8px", border: "none", backgroundColor: "var(--primary-color)", color: "white", cursor: "pointer", fontWeight: "600" }}
                >
                    {showGroupForm ? "Cancel" : "+ New Group Chat"}
                </button>
            </div>

            {showGroupForm && (
                <div style={{ padding: "1rem", backgroundColor: "var(--input-bg)", borderBottom: "1px solid var(--border-color)" }}>
                    <form onSubmit={handleCreateGroup}>
                        <input
                            type="text"
                            placeholder="Group Name"
                            className="message-input"
                            style={{ width: "100%", marginBottom: "1rem" }}
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            required
                        />
                        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>Select Members:</p>
                        <div style={{ maxHeight: "150px", overflowY: "auto", marginBottom: "1rem" }}>
                            {users.map(u => (
                                <div key={u._id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedMembers.includes(u._id)}
                                        onChange={() => toggleMember(u._id)}
                                    />
                                    <span style={{ fontSize: "0.9rem" }}>{u.name}</span>
                                </div>
                            ))}
                        </div>
                        <button type="submit" disabled={!groupName || selectedMembers.length === 0} style={{ width: "100%", padding: "0.5rem", borderRadius: "8px", border: "none", backgroundColor: "var(--primary-color)", color: "white", cursor: "pointer", opacity: (!groupName || selectedMembers.length === 0) ? 0.5 : 1 }}>
                            Create
                        </button>
                    </form>
                </div>
            )}

            <div className="users-list">
                {rooms.length > 0 && (
                    <>
                        <h3 style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginLeft: "0.5rem", marginTop: "1rem" }}>
                            Chats
                        </h3>
                        {rooms.filter(isValidRoom).map(room => (
                            <button
                                key={room._id}
                                className={`user-item ${selectedChatId === room._id ? 'active' : ''}`}
                                onClick={() => onSelectChat(room)}
                            >
                                <div className="user-avatar" style={room.isGroupChat ? { backgroundColor: "#14b8a6" } : {}}>
                                    {room.isGroupChat ? "G" : getChatName(room)[0]?.toUpperCase()}
                                </div>
                                <div className="user-info">
                                    <div className="user-name">{getChatName(room)}</div>
                                </div>
                            </button>
                        ))}
                    </>
                )}

                <h3 style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginLeft: "0.5rem", marginTop: "1rem" }}>
                    All Users
                </h3>
                {users.map(u => (
                    <button
                        key={u._id}
                        className="user-item"
                        onClick={() => startChat(u._id)}
                    >
                        <div className="user-avatar">{u.name[0].toUpperCase()}</div>
                        <div className="user-info">
                            <div className="user-name">{u.name}</div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default Sidebar;
