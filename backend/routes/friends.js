const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const FriendRequest = require("../models/FriendRequest");
const User = require("../models/User");

// Get all users except yourself
router.get("/users", verifyToken, async (req, res) => {
  const users = await User.find({ username: { $ne: req.user.username } });
  console.log(`[friends] list users for=${req.user.username} count=${users.length}`);
  res.json(users);
});

// Send a friend request
router.post("/request", verifyToken, async (req, res) => {
  const { to } = req.body;

  if (!to) return res.status(400).json({ error: "Target username required" });
  if (to === req.user.username)
    return res.status(400).json({ error: "You can't add yourself" });

  const existing = await FriendRequest.findOne({
    from: req.user.username,
    to,
  });
  if (existing) return res.status(400).json({ error: "Request already sent" });

  const request = new FriendRequest({ from: req.user.username, to });
  await request.save();
  console.log(`[friends] request saved from=${req.user.username} to=${to}`);
  res.json({ message: "Friend request sent" });
});

// Get received friend requests
router.get("/requests", verifyToken, async (req, res) => {
  const requests = await FriendRequest.find({
    to: req.user.username,
    status: "pending",
  });
  console.log(`[friends] pending requests for=${req.user.username} count=${requests.length}`);
  res.json(requests);
});

// Accept a friend request
router.post("/accept", verifyToken, async (req, res) => {
  const { from } = req.body;

  const request = await FriendRequest.findOneAndUpdate(
    { from, to: req.user.username, status: "pending" },
    { status: "accepted" },
    { new: true }
  );

  if (!request)
    return res.status(404).json({ error: "Friend request not found" });

  // Normalize room id (sorted usernames) so both sides open same room
  const a = from;
  const b = req.user.username;
  const roomId = [a, b].sort().join("_");

  res.json({
    message: "Friend request accepted",
    roomId,
  });
});

// Get accepted friends of current user
router.get("/list", verifyToken, async (req, res) => {
  const me = req.user.username;
  const accepted = await FriendRequest.find({
    status: "accepted",
    $or: [{ from: me }, { to: me }],
  });

  const friendUsernames = Array.from(
    new Set(
      accepted.map((r) => (r.from === me ? r.to : r.from))
    )
  );

  const friends = await User.find({ username: { $in: friendUsernames } }).select(
    "_id username"
  );
  res.json(friends);
});

module.exports = router;
