import React, { useEffect, useState } from "react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const FriendRequests = ({ token, onOpenPrivateChat }) => {
  const [requests, setRequests] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    const fetchRequests = async () => {
      try {
        const res = await fetch(`${API_URL}/api/friends/requests`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!cancelled) setRequests(data);
      } catch (err) {
        if (!cancelled) console.error("Failed to load requests:", err);
      }
    };

    // Initial + poll every 5s to reflect new incoming requests
    fetchRequests();
    const id = setInterval(fetchRequests, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [token]);

  const acceptRequest = async (fromUser) => {
    try {
      const res = await fetch(`${API_URL}/api/friends/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ from: fromUser }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(`You accepted ${fromUser}'s request 👍`);
        if (data.roomId && onOpenPrivateChat) onOpenPrivateChat(data.roomId);
      } else {
        setMessage(data.error || "Error accepting request");
      }

      setRequests((prev) => prev.filter((r) => r.from !== fromUser));
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error("Error accepting request:", err);
      setMessage("Error accepting request");
    }
  };

  return (
    <div className="friend-requests-content">
      {message && <p className="message">{message}</p>}
      {requests.length === 0 ? (
        <p>No pending requests</p>
      ) : (
        <ul>
          {requests.map((req) => (
            <li key={req._id}>
              <span>{req.from}</span>
              <button onClick={() => acceptRequest(req.from)}>Accept</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FriendRequests;
