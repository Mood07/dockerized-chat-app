const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const Message = require("../models/Message");
const { getProducer, KAFKA_TOPIC } = require("../lib/kafka");

// Get all messages from a specific room
router.get("/:roomId", verifyToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const messages = await Message.find({ roomId }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Send message to private room
router.post("/:roomId", verifyToken, async (req, res) => {
  try {
  const { roomId } = req.params;
  const { text } = req.body;
  const newMessage = new Message({
    username: req.user.username,
    text,
    roomId,
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
    console.error(err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

module.exports = router;
