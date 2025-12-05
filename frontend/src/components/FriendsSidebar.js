import React, { useEffect, useState } from "react";
import FriendRequests from "./FriendRequests";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const FriendsSidebar = ({
  token,
  username,
  onOpenPrivateChat,
  onOpenGlobalChat,
}) => {
  const [users, setUsers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    const fetchUsers = async () => {
      try {
        const res = await fetch(`${API_URL}/api/friends/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!cancelled) setUsers(data);
      } catch (err) {
        if (!cancelled) console.error("Failed to fetch users", err);
      }
    };

    const fetchFriends = async () => {
      try {
        const res = await fetch(`${API_URL}/api/friends/list`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!cancelled) setFriends(data);
      } catch (err) {
        if (!cancelled) console.error("Failed to fetch friends", err);
      }
    };

    // initial
    fetchUsers();
    fetchFriends();
    // polling to reflect recent acceptances and new users
    const id = setInterval(() => {
      fetchUsers();
      fetchFriends();
    }, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [token]);

  const sendRequest = async (toUsername) => {
    try {
      const res = await fetch(`${API_URL}/api/friends/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ to: toUsername }),
      });

      const data = await res.json();
      if (res.ok) setMessage(`Request sent to ${toUsername}`);
      else setMessage(data.error || "Something went wrong");

      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error("Error sending request:", err);
      setMessage("Error sending request");
    }
  };

  const roomIdFor = (a, b) => [a, b].sort().join("_");
  const initials = (name) => name.slice(0, 2).toUpperCase();
  const friendSet = new Set(friends.map((f) => f.username));
  const filteredAll = users.filter((u) =>
    u.username.toLowerCase().includes(query.toLowerCase())
  );
  const others = filteredAll.filter((u) => !friendSet.has(u.username));

  return (
    <div className="sidebar">
      <div className="sidebar-search">
        <input
          type="text"
          placeholder="Search contacts..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {message && <p className="message">{message}</p>}

      <div className="contacts">
        <div className="section-title">Friends</div>
        <div
          className="contact-item"
          onClick={() => onOpenGlobalChat && onOpenGlobalChat()}
          title="Open global chat"
        >
          <div className="contact-avatar">GC</div>
          <div className="contact-name">Global Chat</div>
        </div>
        {friends.map((user) => (
          <div
            key={user._id}
            className="contact-item"
            onClick={() =>
              onOpenPrivateChat(roomIdFor(username, user.username))
            }
            title="Open private chat"
          >
            <div className="contact-avatar">{initials(user.username)}</div>
            <div className="contact-name">{user.username}</div>
          </div>
        ))}

        <div className="section-title">All Users</div>
        {others.map((user) => (
          <div
            key={user._id}
            className="contact-item"
            onClick={() =>
              onOpenPrivateChat(roomIdFor(username, user.username))
            }
            title="Open private chat"
          >
            <div className="contact-avatar">{initials(user.username)}</div>
            <div className="contact-name">{user.username}</div>
            <div className="contact-actions">
              <button
                className="add-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  sendRequest(user.username);
                }}
              >
                Add
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="friend-requests">
        <FriendRequests token={token} onOpenPrivateChat={onOpenPrivateChat} />
      </div>
    </div>
  );
};

export default FriendsSidebar;
