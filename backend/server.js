const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { initKafka, getConsumer, getProducer } = require("./lib/kafka");
const WebSocket = require("ws");
const http = require("http");

const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");
const friendsRoutes = require("./routes/friends");
const privateMessagesRoutes = require("./routes/privateMessages");

const verifyToken = require("./middleware/authMiddleware");
const Message = require("./models/Message");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.json({
    message: "Dockerized Chat App Backend API",
    status: "Running",
    endpoints: {
      auth: "/api/auth",
      messages: "/api/messages",
      friends: "/api/friends",
      private: "/api/private",
    },
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/friends", friendsRoutes);
app.use("/api/private", privateMessagesRoutes);

// Protected route - only logged in users can access
app.get("/api/protected", verifyToken, (req, res) => {
  res.json({
    message: `Hello ${req.user.username}, you have access to this protected route!`,
  });
});

// Environment variables
const PORT = process.env.PORT || 5000;
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://chatadmin:chatpass123@localhost:27017/chatdb?authSource=admin";

// MongoDB Connection
mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

// WebSocket clients
const clients = new Set();

// WebSocket connection handling
wss.on("connection", (ws) => {
  console.log("New WebSocket client connected");
  clients.add(ws);

  ws.on("close", () => {
    console.log("WebSocket client disconnected");
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

// Initialize Kafka consumer and forward to WebSocket
async function startKafkaConsumer() {
  try {
    const { consumer } = await initKafka();
    await consumer.run({
      eachMessage: async ({ message }) => {
        const messageData = JSON.parse(message.value.toString());
        console.log("Received message from Kafka:", messageData);
        broadcastMessage(messageData);
      },
    });
  } catch (error) {
    console.error("Kafka initialization error:", error);
  }
}

// REST API: Health check
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
  await startKafkaConsumer();

  server.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
    console.log("WebSocket server ready");
  });
}

startServer().catch(console.error);

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM signal received: closing HTTP server");
  try {
    await getConsumer().disconnect();
  } catch {}
  try {
    await getProducer().disconnect();
  } catch {}
  server.close(() => {
    console.log("HTTP server closed");
  });
});
