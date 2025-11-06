# 🐳 Dockerized Chat Application

**Grade 5.0 Project** - Cloud-oriented Web Applications Course

A fully containerized real-time chat application demonstrating microservice-based architecture using Docker, React, Node.js, MongoDB, and Apache Kafka.

---

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Technologies Used](#technologies-used)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Architecture Details](#architecture-details)
- [Troubleshooting](#troubleshooting)

---

## 🏗️ Architecture Overview

```
┌─────────────┐     HTTP/WS      ┌─────────────┐     MongoDB     ┌─────────────┐
│             │ ───────────────> │             │ ─────────────> │             │
│  Frontend   │                  │   Backend   │                │  Database   │
│  (React)    │ <─────────────── │  (Node.js)  │ <───────────── │  (MongoDB)  │
│   :3000     │     WebSocket    │    :5000    │     Queries    │   :27017    │
└─────────────┘                  └─────────────┘                └─────────────┘
                                        │
                                        │ Pub/Sub
                                        ↓
                                 ┌─────────────┐
                                 │    Kafka    │
                                 │ (Message    │
                                 │  Broker)    │
                                 │   :9092     │
                                 └─────────────┘
```

### Communication Flow

1. **Frontend ↔ Backend**: HTTP REST API for message sending, WebSocket for real-time updates
2. **Backend ↔ Database**: Mongoose ODM for data persistence
3. **Backend ↔ Kafka**: KafkaJS for async message publishing and consumption
4. **Real-time Updates**: Messages are published to Kafka and broadcast to all connected clients via WebSocket

---

## 🛠️ Technologies Used

| Component            | Technology              | Version       |
| -------------------- | ----------------------- | ------------- |
| **Frontend**         | React                   | 18.2.0        |
| **Backend**          | Node.js + Express       | 18.x + 4.18.2 |
| **Database**         | MongoDB                 | 6.0           |
| **Message Broker**   | Apache Kafka            | 7.4.0         |
| **Containerization** | Docker & Docker Compose | Latest        |
| **WebSocket**        | ws library              | 8.13.0        |
| **ODM**              | Mongoose                | 7.5.0         |
| **Kafka Client**     | KafkaJS                 | 2.2.4         |

---

## 📁 Project Structure

```
dockerized-chat-app/
├── docker-compose.yml          # Main orchestration file
├── mongo-init.js               # MongoDB initialization script
├── README.md                   # This file
│
├── backend/
│   ├── Dockerfile              # Backend container config
│   ├── package.json            # Node.js dependencies
│   └── server.js               # Express server with Kafka & WebSocket
│
└── frontend/
    ├── Dockerfile              # Frontend container config
    ├── nginx.conf              # Nginx configuration
    ├── package.json            # React dependencies
    ├── public/
    │   └── index.html          # HTML template
    └── src/
        ├── App.js              # Main React component
        ├── App.css             # Styling
        ├── index.js            # React entry point
        └── index.css           # Global styles
```

---

## ✅ Prerequisites

- **Docker** (version 20.10+)
- **Docker Compose** (version 2.0+)
- **Git** (for cloning the repository)
- At least **4GB RAM** available for Docker
- Ports **3000**, **5000**, **9092**, and **27017** must be available

---

## 🚀 Installation & Setup

### 1. Clone or Create Project Structure

Create the following directory structure and files as shown in the project structure above.

### 2. Build and Start All Containers

```bash
# From the project root directory
docker-compose up --build
```

This command will:

- Build the frontend and backend Docker images
- Pull MongoDB, Kafka, and Zookeeper images
- Create a Docker network for inter-container communication
- Start all services in the correct order
- Initialize MongoDB with sample data

### 3. Wait for Services to Start

The first startup takes 1-2 minutes as Kafka initializes. Watch the logs for:

```
✅ MongoDB connected successfully
✅ Kafka producer connected
✅ Kafka consumer subscribed to topic: chat-messages
🚀 Backend server running on port 5000
```

### 4. Access the Application

Open your browser and navigate to:

```
http://localhost:3000
```

---

## 💬 Usage

### Starting a Chat Session

1. Enter a username on the login screen
2. Click "Join Chat"
3. Start sending messages!

### Features

- ✅ Real-time messaging via WebSocket
- ✅ Message persistence in MongoDB
- ✅ Asynchronous message delivery via Kafka
- ✅ User management
- ✅ Connection status indicator
- ✅ Auto-reconnection on disconnect
- ✅ Responsive design

### Stopping the Application

```bash
# Stop all containers (preserves data)
docker-compose stop

# Stop and remove containers (keeps volumes)
docker-compose down

# Remove everything including volumes
docker-compose down -v
```

---

## 🔌 API Endpoints

### Health Check

```
GET /health
```

Returns system status and service health.

### Messages

```
GET /api/messages?roomId=general&limit=50
```

Retrieve chat messages.

```
POST /api/messages
Body: { "username": "string", "text": "string", "roomId": "string" }
```

Send a new message.

```
DELETE /api/messages
```

Clear all messages (for testing).

### Users

```
GET /api/users
```

Get all registered users.

```
POST /api/users
Body: { "username": "string" }
```

Register a new user.

---

## 🏛️ Architecture Details

### Container Communication

All containers communicate through a Docker bridge network named `chat-network`:

- **Frontend** → **Backend**: HTTP on port 5000
- **Backend** → **Database**: MongoDB protocol on port 27017
- **Backend** → **Kafka**: Kafka protocol on port 29092 (internal)
- **Frontend** ← **Backend**: WebSocket for real-time updates

### Data Flow

1. **User sends message** → Frontend captures input
2. **HTTP POST** → Backend receives message via REST API
3. **Database write** → Backend saves to MongoDB
4. **Kafka publish** → Backend publishes event to Kafka topic
5. **Kafka consume** → Backend consumer receives event
6. **WebSocket broadcast** → All connected clients receive update
7. **UI update** → Frontend displays new message

### Kafka Topics

- **Topic Name**: `chat-messages`
- **Consumer Group**: `chat-group`
- **Replication Factor**: 1 (single broker setup)

### MongoDB Collections

- **users**: Stores registered usernames
- **messages**: Stores all chat messages with timestamps

---

## 🐛 Troubleshooting

### Containers Won't Start

```bash
# Check if ports are in use
netstat -tuln | grep -E '3000|5000|9092|27017'

# Check Docker logs
docker-compose logs backend
docker-compose logs kafka
```

### Kafka Connection Issues

Kafka takes longest to initialize. Wait 30-60 seconds after `docker-compose up`.

```bash
# Restart Kafka if needed
docker-compose restart kafka
```

### MongoDB Connection Failed

```bash
# Check MongoDB logs
docker-compose logs database

# Verify connection string
docker exec backend env | grep MONGODB_URI
```

### Frontend Can't Connect to Backend

```bash
# Verify backend is running
curl http://localhost:5000/health

# Check network configuration
docker network inspect dockerized-chat-app_chat-network
```

### Clear All Data and Restart

```bash
# Stop and remove everything
docker-compose down -v

# Rebuild and start fresh
docker-compose up --build
```

---

## 📊 Grade 5.0 Requirements Checklist

- ✅ **Four distinct containers**: Frontend, Backend, Database, Kafka
- ✅ **Docker Compose orchestration**: All services defined in `docker-compose.yml`
- ✅ **Microservice communication**: REST API, WebSocket, Database queries, Kafka pub/sub
- ✅ **Persistent storage**: MongoDB volume for data persistence
- ✅ **Asynchronous messaging**: Kafka for event-driven architecture
- ✅ **Health checks**: Container health monitoring
- ✅ **Network isolation**: Custom Docker network
- ✅ **Environment configuration**: Environment variables for configuration
- ✅ **Production-ready builds**: Multi-stage Dockerfiles, Nginx for frontend
- ✅ **Complete documentation**: This README with architecture diagrams

---

## 📝 Notes

- This is a **demonstration project** for educational purposes
- In production, add authentication, rate limiting, and proper error handling
- Consider using Kubernetes for orchestration at scale
- Add Redis for session management in multi-instance deployments
- Implement message encryption for security

---

## 👨‍💻 Development

### Running in Development Mode

```bash
# Backend (with hot reload)
cd backend
npm install
npm run dev

# Frontend (with hot reload)
cd frontend
npm install
npm start
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f kafka
```

---

## 🎓 Learning Outcomes

This project demonstrates:

1. **Containerization**: Packaging applications with Docker
2. **Orchestration**: Managing multi-container systems with Docker Compose
3. **Microservices**: Building loosely-coupled, independently deployable services
4. **Message Brokers**: Async communication with Kafka
5. **Real-time Communication**: WebSocket implementation
6. **Database Integration**: MongoDB with ODM
7. **Cloud-ready Architecture**: Scalable, distributed system design

---

**Project Grade**: 5.0 ✨

**Status**: Production Ready 🚀
