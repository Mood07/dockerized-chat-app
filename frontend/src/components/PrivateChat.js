import React, { useEffect, useState } from "react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const PrivateChat = ({ token, roomId, username, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const WS_URL = (API_URL || "").replace(/^http/, "ws");

  const peerName = roomId?.split("_").find((p) => p !== username) || "Private";
  const initials = (name) => (name ? name.slice(0, 2).toUpperCase() : "PC");

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch(`${API_URL}/api/private/${roomId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setMessages(data);
      } catch (error) {
        console.error("Error fetching private messages:", error);
      }
    };
    fetchMessages();

    let ws;
    try {
      ws = new WebSocket(WS_URL);
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg && msg.roomId === roomId) {
            setMessages((prev) => {
              if (prev.some((m) => m._id === msg._id)) return prev;
              return [...prev, msg];
            });
          }
        } catch {}
      };
    } catch {}
    return () => {
      try {
        ws && ws.close();
      } catch {}
    };
  }, [roomId, token]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const res = await fetch(`${API_URL}/api/private/${roomId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: newMessage }),
      });

      await res.json();
      setNewMessage("");
    } catch (error) {
      console.error("Error sending private message:", error);
    }
  };

  return (
    <div className="chat-main">
      <header className="chat-header">
        <button onClick={onBack} className="back-btn">←</button>
        <div className="header-avatar">{initials(peerName)}</div>
        <div className="header-title">Chat with {peerName}</div>
      </header>

      <div className="chat-body">
        {messages.length === 0 ? (
          <p className="no-messages">No messages yet</p>
        ) : (
          messages.map((msg, i) => {
            const mine = msg.username === username;
            const time = msg.timestamp
              ? new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "";
            return (
              <div key={i} className={`message-row ${mine ? "me" : ""}`}>
                <div className={`bubble ${mine ? "me" : ""}`}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    {msg.username}
                  </div>
                  <div>{msg.text}</div>
                  <span className="meta">{time}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={sendMessage} className="chat-input">
        <input
          type="text"
          placeholder={`Message ${peerName}...`}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

export default PrivateChat;

