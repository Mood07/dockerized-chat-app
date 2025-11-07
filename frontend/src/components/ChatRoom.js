import React, { useState, useEffect } from "react";
// Sidebar is rendered in App; this renders only chat area

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

function ChatRoom({ token, username }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const roomId = "general";
  const WS_URL = (API_URL || "").replace(/^http/, "ws");

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch(`${API_URL}/api/messages`);
        const data = await res.json();
        setMessages(data);
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };
    fetchMessages();
  }, []);

  useEffect(() => {
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
      try { ws && ws.close(); } catch {}
    };
  }, []);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const res = await fetch(`${API_URL}/api/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: newMessage,
          roomId,
        }),
      });

      if (!res.ok) throw new Error("Failed to send message");
      await res.json();
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div className="chat-main">
        <header className="chat-header">
          <div className="header-avatar">GC</div>
          <div className="header-title">Global Chat</div>
        </header>

        <div className="chat-body">
          {messages.map((msg, index) => {
            const mine = msg.username === username;
            const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : '';
            return (
              <div key={index} className={`message-row ${mine ? 'me' : ''}`}>
                <div className={`bubble ${mine ? 'me' : ''}`}>
                  <div style={{fontWeight: 600, marginBottom: 4}}>{msg.username}</div>
                  <div>{msg.text}</div>
                  <span className="meta">{time}</span>
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={sendMessage} className="chat-input">
          <input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <button type="submit">Send</button>
        </form>
    </div>
  );
}

export default ChatRoom;
