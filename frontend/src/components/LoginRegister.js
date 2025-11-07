import React, { useState } from "react";
import "../App.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const LoginRegister = ({ setToken, setUsername }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const endpoint = isRegister ? "register" : "login";
      const res = await fetch(`${API_URL}/api/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        setToken(data.token);
        setUsername(username);
      } else {
        setError(data.message || "Something went wrong");
      }
    } catch {
      setError("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Docker Chat</h1>
        <p>{isRegister ? "Create an account" : "Welcome back"}</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUser(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? "Please wait..." : isRegister ? "Register" : "Login"}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
        <button className="toggle" onClick={() => setIsRegister(!isRegister)}>
          {isRegister
            ? "Already have an account? Login"
            : "Don't have an account? Register"}
        </button>
      </div>
    </div>
  );
};

export default LoginRegister;

