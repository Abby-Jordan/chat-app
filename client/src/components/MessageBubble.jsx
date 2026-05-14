import { useAuth } from "../context/AuthContext";

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
                {message.content}
            </div>
            <div className="message-meta">
                {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
        </div>
    );
};

export default MessageBubble;
