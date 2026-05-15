import { useState, useRef } from "react";
import { useSocket } from "../context/SocketContext";
import API from "../api/axios";

const MessageInput = ({ roomId, users = [], onSelectChat }) => {
    const [content, setContent] = useState("");
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState(null); // { file, localUrl, fileType }
    const { socket } = useSocket();
    const fileInputRef = useRef(null);

    // ── File picker ─────────────────────────────────────────────────────
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const isImage = file.type.startsWith("image/");
        const localUrl = isImage ? URL.createObjectURL(file) : null;
        const fileType = file.type.startsWith("image/") ? "image"
            : file.type.startsWith("video/") ? "video"
                : file.type.startsWith("audio/") ? "audio"
                    : "document";
        setPreview({ file, localUrl, fileType, name: file.name, size: file.size });
        // Reset input so same file can be selected again
        e.target.value = "";
    };

    const cancelPreview = () => {
        if (preview?.localUrl) URL.revokeObjectURL(preview.localUrl);
        setPreview(null);
    };

    // ── Send ────────────────────────────────────────────────────────────
    const handleSend = async (e) => {
        e.preventDefault();
        if ((!content.trim() && !preview) || !socket) return;

        // @mention for text messages
        if (content.trim().startsWith('@') && !preview) {
            const mentionMatch = content.match(/^@(\S+)\s+([\s\S]+)$/);
            if (mentionMatch) {
                const mentionedName = mentionMatch[1].toLowerCase();
                const actualMessage = mentionMatch[2].trim();
                const targetUser = users.find(u =>
                    u.name.toLowerCase() === mentionedName ||
                    u.name.toLowerCase().startsWith(mentionedName)
                );
                if (targetUser) {
                    try {
                        const { data: dmRoom } = await API.post("/rooms", { memberId: targetUser._id });
                        onSelectChat(dmRoom);
                        socket.emit("send_message", { roomId: dmRoom._id, content: actualMessage });
                        setContent("");
                        socket.emit("stop_typing", { roomId });
                        return;
                    } catch (err) {
                        console.error("@mention DM failed", err);
                    }
                }
            }
        }

        // File upload
        if (preview) {
            setUploading(true);
            try {
                const formData = new FormData();
                formData.append("file", preview.file);
                const { data } = await API.post("/upload", formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                socket.emit("send_message", {
                    roomId,
                    content: content.trim() || "",
                    fileUrl: data.fileUrl,
                    fileName: data.fileName,
                    fileType: data.fileType,
                    fileSize: data.fileSize,
                });
                cancelPreview();
                setContent("");
            } catch (err) {
                console.error("Upload failed", err);
                alert("File upload failed. Please try again.");
            } finally {
                setUploading(false);
            }
            return;
        }

        // Normal text message
        socket.emit("send_message", { roomId, content });
        setContent("");
        socket.emit("stop_typing", { roomId });
    };

    const handleTyping = (e) => {
        setContent(e.target.value);
        if (socket) {
            socket.emit("typing", { roomId });
            setTimeout(() => socket.emit("stop_typing", { roomId }), 2000);
        }
    };

    const formatSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="message-input-container">
            {/* File preview */}
            {preview && (
                <div style={{
                    background: "var(--input-bg)", borderRadius: "12px",
                    padding: "0.75rem 1rem", marginBottom: "0.75rem",
                    display: "flex", alignItems: "center", gap: "0.75rem",
                    border: "1px solid var(--border-color)",
                }}>
                    {preview.fileType === "image" ? (
                        <img src={preview.localUrl} alt="preview"
                            style={{ width: "48px", height: "48px", objectFit: "cover", borderRadius: "6px" }} />
                    ) : (
                        <div style={{ fontSize: "1.8rem" }}>
                            {preview.fileType === "video" ? "🎥"
                                : preview.fileType === "audio" ? "🎵"
                                    : "📄"}
                        </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "0.85rem", fontWeight: "500", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {preview.name}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{formatSize(preview.size)}</div>
                    </div>
                    <button onClick={cancelPreview}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1.1rem" }}>
                        ✕
                    </button>
                </div>
            )}

            <form onSubmit={handleSend} className="message-form">
                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                />

                {/* Attach button */}
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={{
                        background: "none", border: "1px solid var(--border-color)",
                        borderRadius: "50%", width: "45px", height: "45px",
                        cursor: "pointer", fontSize: "1.1rem", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "var(--text-muted)",
                    }}
                    title="Attach file / photo / doc"
                >
                    📎
                </button>

                <input
                    type="text"
                    value={content}
                    onChange={handleTyping}
                    placeholder={preview ? "Add a caption... (optional)" : "Type a message... (@name msg for DM, @bot for AI)"}
                    className="message-input"
                />
                <button
                    type="submit"
                    className="send-button"
                    disabled={(!content.trim() && !preview) || uploading}
                >
                    {uploading ? "⏳" : "➤"}
                </button>
            </form>
        </div>
    );
};

export default MessageInput;
