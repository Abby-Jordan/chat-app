import { useAuth } from "../context/AuthContext";

const FilePreview = ({ fileUrl, fileName, fileType }) => {
    if (!fileUrl) return null;

    if (fileType === "image") {
        return (
            <a href={fileUrl} target="_blank" rel="noreferrer">
                <img
                    src={fileUrl}
                    alt={fileName}
                    style={{
                        maxWidth: "240px", maxHeight: "200px",
                        borderRadius: "8px", display: "block",
                        cursor: "pointer", marginBottom: "4px",
                    }}
                />
            </a>
        );
    }

    if (fileType === "video") {
        return (
            <video controls style={{ maxWidth: "280px", borderRadius: "8px", marginBottom: "4px" }}>
                <source src={fileUrl} />
            </video>
        );
    }

    if (fileType === "audio") {
        return (
            <audio controls style={{ width: "240px", marginBottom: "4px" }}>
                <source src={fileUrl} />
            </audio>
        );
    }

    // Document / other
    return (
        <a
            href={fileUrl}
            download={fileName}
            target="_blank"
            rel="noreferrer"
            style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                padding: "0.5rem 0.75rem",
                background: "rgba(0,0,0,0.15)",
                borderRadius: "8px", marginBottom: "4px",
                textDecoration: "none", color: "inherit",
                fontSize: "0.85rem",
            }}
        >
            <span style={{ fontSize: "1.4rem" }}>📄</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "180px" }}>
                {fileName || "Download file"}
            </span>
            <span style={{ fontSize: "1rem", flexShrink: 0 }}>⬇️</span>
        </a>
    );
};

const MessageBubble = ({ message }) => {
    const { user } = useAuth();

    const isMine = message.sender._id === user._id || message.sender === user._id;
    const isBot = message.isBot;

    let wrapperClass = "message-wrapper ";
    if (isBot) wrapperClass += "others bot";
    else if (isMine) wrapperClass += "mine";
    else wrapperClass += "others";

    return (
        <div className={wrapperClass}>
            {(!isMine || isBot) && (
                <div className="message-sender">
                    {isBot ? "AI Bot" : message.sender.name || "User"}
                </div>
            )}
            <div className="message-bubble">
                {/* File/media content */}
                {message.fileUrl && (
                    <FilePreview
                        fileUrl={message.fileUrl}
                        fileName={message.fileName}
                        fileType={message.fileType}
                    />
                )}
                {/* Text content (caption or message) */}
                {message.content && (
                    <span>{message.content}</span>
                )}
            </div>
            <div className="message-meta">
                {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
        </div>
    );
};

export default MessageBubble;
