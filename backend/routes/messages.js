const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const verifyToken = require("../middleware/authMiddleware");
const { getProducer, KAFKA_TOPIC } = require("../lib/kafka");

// Get all messages (Global Chat)
router.get("/", async (req, res) => {
  try {
    const messages = await Message.find({ roomId: "general" }).sort({
      timestamp: 1,
    });
    res.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Failed to load messages" });
  }
});

// Send a message to global chat
router.post("/", verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    const username = req.user.username;
    if (!username || !text)
      return res.status(400).json({ error: "Missing fields" });

    const newMessage = new Message({
      username,
      text,
      roomId: "general",
    });

    await newMessage.save();

    // Publish to Kafka for WebSocket broadcast
    try {
      const producer = getProducer();
      await producer.send({
        topic: KAFKA_TOPIC,
        messages: [
          { value: JSON.stringify(newMessage) },
        ],
      });
    } catch (e) {
      console.error("Kafka publish failed:", e);
    }

    res.json(newMessage);
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

module.exports = router;
