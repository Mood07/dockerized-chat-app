// MongoDB initialization script
// This script runs when the MongoDB container is first created

db = db.getSiblingDB("chatdb");

// Create collections
db.createCollection("users");
db.createCollection("messages");

// Create indexes for better performance
db.users.createIndex({ username: 1 }, { unique: true });
db.messages.createIndex({ timestamp: -1 });
db.messages.createIndex({ roomId: 1, timestamp: -1 });

// Insert sample data for testing
db.users.insertMany([
  {
    username: "demo_user",
    createdAt: new Date(),
  },
]);

db.messages.insertMany([
  {
    username: "System",
    text: "Welcome to the Dockerized Chat Application! 🎉",
    timestamp: new Date(),
    roomId: "general",
  },
  {
    username: "System",
    text: "This chat demonstrates microservices architecture with Docker, MongoDB, Kafka, and WebSockets.",
    timestamp: new Date(),
    roomId: "general",
  },
]);

print("✅ MongoDB initialization completed successfully!");
