import React, { useState, useEffect, useRef } from "react";
import "./App.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const WS_URL = API_URL.replace("http", "ws");

function App() {
  const [username, setUsername] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");

  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (isLoggedIn) {
      connectWebSocket();
      loadMessages();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isLoggedIn]);

  const connectWebSocket = () => {
    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        setConnectionStatus("Connected");
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        setMessages((prev) => [...prev, message]);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setConnectionStatus("Connection error");
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
        setIsConnected(false);
        setConnectionStatus("Disconnected - Reconnecting...");

        // Reconnect after 3 seconds
        setTimeout(() => {
          if (isLoggedIn) {
            connectWebSocket();
          }
        }, 3000);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      setConnectionStatus("Connection failed");
    }
  };

  const loadMessages = async () => {
    try {
      const response = await fetch(`${API_URL}/api/messages?limit=100`);
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (username.trim()) {
      try {
        await fetch(`${API_URL}/api/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: username.trim() }),
        });
        setIsLoggedIn(true);
      } catch (error) {
        console.error("Login failed:", error);
        alert("Failed to login. Please try again.");
      }
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (newMessage.trim() && isLoggedIn) {
      try {
        await fetch(`${API_URL}/api/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            text: newMessage.trim(),
            roomId: "general",
          }),
        });
        setNewMessage("");
      } catch (error) {
        console.error("Failed to send message:", error);
        alert("Failed to send message. Please try again.");
      }
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h1>🐳 Dockerized Chat</h1>
          <p className="subtitle">Microservices Architecture Demo</p>
          <form onSubmit={handleLogin}>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={20}
              autoFocus
            />
            <button type="submit">Join Chat</button>
          </form>
          <div className="tech-stack">
            <span>React</span>
            <span>Node.js</span>
            <span>MongoDB</span>
            <span>Kafka</span>
            <span>Docker</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div>
          <h1>💬 Chat Room</h1>
          <p>
            Logged in as <strong>{username}</strong>
          </p>
        </div>
        <div className="status">
          <span
            className={`status-indicator ${
              isConnected ? "connected" : "disconnected"
            }`}
          >
            {isConnected ? "🟢" : "🔴"}
          </span>
          <span className="status-text">{connectionStatus}</span>
        </div>
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <p>No messages yet. Start the conversation! 👋</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={msg._id || index}
              className={`message ${
                msg.username === username ? "own-message" : ""
              }`}
            >
              <div className="message-header">
                <span className="message-username">{msg.username}</span>
                <span className="message-time">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
              <div className="message-text">{msg.text}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="message-input-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          maxLength={500}
        />
        <button type="submit" disabled={!newMessage.trim() || !isConnected}>
          Send
        </button>
      </form>

      <div className="architecture-info">
        <small>Architecture: Frontend ↔ Backend ↔ MongoDB ↔ Kafka</small>
      </div>
    </div>
  );
}

export default App;
