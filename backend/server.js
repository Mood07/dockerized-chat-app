const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { Kafka } = require("kafkajs");
const WebSocket = require("ws");
const http = require("http");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());

// Environment variables
const PORT = process.env.PORT || 5000;
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://chatadmin:chatpass123@localhost:27017/chatdb?authSource=admin";
const KAFKA_BROKER = process.env.KAFKA_BROKER || "localhost:9092";
const KAFKA_TOPIC = process.env.KAFKA_TOPIC || "chat-messages";

// MongoDB Connection
mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// MongoDB Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});

const messageSchema = new mongoose.Schema({
  username: { type: String, required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  roomId: { type: String, default: "general" },
});

const User = mongoose.model("User", userSchema);
const Message = mongoose.model("Message", messageSchema);

// Kafka Setup
const kafka = new Kafka({
  clientId: "chat-backend",
  brokers: [KAFKA_BROKER],
  retry: {
    initialRetryTime: 300,
    retries: 10,
  },
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: "chat-group" });

// WebSocket clients
const clients = new Set();

// WebSocket connection handling
wss.on("connection", (ws) => {
  console.log("🔌 New WebSocket client connected");
  clients.add(ws);

  ws.on("close", () => {
    console.log("🔌 WebSocket client disconnected");
    clients.delete(ws);
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});

// Broadcast message to all WebSocket clients
function broadcastMessage(message) {
  const messageStr = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

// Initialize Kafka
async function initKafka() {
  try {
    await producer.connect();
    console.log("✅ Kafka producer connected");

    await consumer.connect();
    await consumer.subscribe({ topic: KAFKA_TOPIC, fromBeginning: false });
    console.log(`✅ Kafka consumer subscribed to topic: ${KAFKA_TOPIC}`);

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const messageData = JSON.parse(message.value.toString());
        console.log("📨 Received message from Kafka:", messageData);

        // Broadcast to WebSocket clients
        broadcastMessage(messageData);
      },
    });
  } catch (error) {
    console.error("❌ Kafka initialization error:", error);
  }
}

// REST API Endpoints

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    services: {
      database:
        mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      kafka: "connected",
    },
  });
});

// Get all messages
app.get("/api/messages", async (req, res) => {
  try {
    const { roomId = "general", limit = 50 } = req.query;
    const messages = await Message.find({ roomId })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.json(messages.reverse());
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Post a new message
app.post("/api/messages", async (req, res) => {
  try {
    const { username, text, roomId = "general" } = req.body;

    if (!username || !text) {
      return res.status(400).json({ error: "Username and text are required" });
    }

    // Save to MongoDB
    const message = new Message({ username, text, roomId });
    await message.save();

    // Publish to Kafka
    await producer.send({
      topic: KAFKA_TOPIC,
      messages: [
        {
          value: JSON.stringify({
            _id: message._id,
            username: message.username,
            text: message.text,
            timestamp: message.timestamp,
            roomId: message.roomId,
          }),
        },
      ],
    });

    console.log("✅ Message saved and published to Kafka");
    res.status(201).json(message);
  } catch (error) {
    console.error("Error posting message:", error);
    res.status(500).json({ error: "Failed to post message" });
  }
});

// Get all users
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find().select("username createdAt");
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Create a new user
app.post("/api/users", async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.json(existingUser);
    }

    const user = new User({ username });
    await user.save();

    console.log(`✅ New user created: ${username}`);
    res.status(201).json(user);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Delete all messages (for testing)
app.delete("/api/messages", async (req, res) => {
  try {
    await Message.deleteMany({});
    res.json({ message: "All messages deleted" });
  } catch (error) {
    console.error("Error deleting messages:", error);
    res.status(500).json({ error: "Failed to delete messages" });
  }
});

// Start server
async function startServer() {
  await initKafka();

  server.listen(PORT, () => {
    console.log(`🚀 Backend server running on port ${PORT}`);
    console.log(`📡 WebSocket server ready`);
  });
}

startServer().catch(console.error);

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM signal received: closing HTTP server");
  await producer.disconnect();
  await consumer.disconnect();
  server.close(() => {
    console.log("HTTP server closed");
  });
});
