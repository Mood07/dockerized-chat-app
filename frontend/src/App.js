import React, { useState } from "react";
import LoginRegister from "./components/LoginRegister";
import ChatRoom from "./components/ChatRoom";
import FriendsSidebar from "./components/FriendsSidebar";
import PrivateChat from "./components/PrivateChat";
import "./App.css";

const App = () => {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [username, setUsername] = useState(
    localStorage.getItem("username") || ""
  );
  const [activeChat, setActiveChat] = useState("global");
  const [activeRoomId, setActiveRoomId] = useState(null);

  const handleLogin = (newToken, newUsername) => {
    setToken(newToken);
    setUsername(newUsername);
    localStorage.setItem("token", newToken);
    localStorage.setItem("username", newUsername);
  };

  const handleLogout = () => {
    setToken("");
    setUsername("");
    localStorage.removeItem("token");
    localStorage.removeItem("username");
  };

  if (!token) {
    return <LoginRegister setToken={setToken} setUsername={setUsername} />;
  }

  const openPrivateChat = (roomId) => {
    setActiveRoomId(roomId);
    setActiveChat("private");
  };

  const backToGlobal = () => {
    setActiveRoomId(null);
    setActiveChat("global");
  };

  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-username">{username}</div>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
        <FriendsSidebar
          token={token}
          username={username}
          onOpenPrivateChat={openPrivateChat}
          onOpenGlobalChat={backToGlobal}
        />
      </div>

      <div className="chat-area">
        {activeChat === "global" ? (
          <ChatRoom token={token} username={username} />
        ) : (
          <PrivateChat
            token={token}
            username={username}
            roomId={activeRoomId}
            onBack={backToGlobal}
          />
        )}
      </div>
    </div>
  );
};

export default App;
