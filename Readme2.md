Frontend: http://localhost:3000

Backend API: http://localhost:5000

MongoDB: localhost:27017 (chatadmin / chatpass123)

# 🐳 Docker Files Documentation

This document describes the locations and contents of all Docker-related files in the project.

---

## 📁 File Structure

```
dockerized-chat-app/
├── docker-compose.yml      # Main orchestration file
├── mongo-init.js           # MongoDB initialization script
├── backend/
│   └── Dockerfile          # Backend container definition
└── frontend/
    ├── Dockerfile          # Frontend container definition
    └── nginx.conf          # Nginx web server configuration
```

---

## 📄 1. docker-compose.yml

**Location:** `./docker-compose.yml`

This file manages all services together and provides orchestration.

### Contents:

```yaml
services:
  # Zookeeper - Required for Kafka
  zookeeper:
    image: confluentinc/cp-zookeeper:7.4.0
    container_name: zookeeper
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    networks:
      - chat-network

  # Kafka Message Broker
  kafka:
    image: confluentinc/cp-kafka:7.4.0
    container_name: kafka
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:29092,PLAINTEXT_HOST://localhost:9092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"
    networks:
      - chat-network
    healthcheck:
      test:
        [
          "CMD",
          "kafka-broker-api-versions",
          "--bootstrap-server",
          "localhost:9092",
        ]
      interval: 10s
      timeout: 10s
      retries: 5

  # MongoDB Database
  database:
    image: mongo:6.0
    container_name: mongodb
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: chatadmin
      MONGO_INITDB_ROOT_PASSWORD: chatpass123
      MONGO_INITDB_DATABASE: chatdb
    volumes:
      - mongodb-data:/data/db
      - ./mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro
    networks:
      - chat-network
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/chatdb --quiet
      interval: 10s
      timeout: 5s
      retries: 5

  # Backend API Service
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: backend
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: production
      PORT: 5000
      MONGODB_URI: mongodb://chatadmin:chatpass123@database:27017/chatdb?authSource=admin
      KAFKA_BROKER: kafka:29092
      KAFKA_TOPIC: chat-messages
      JWT_SECRET: devsecret
      TOKEN_EXPIRE: 7d
      KAFKAJS_NO_PARTITIONER_WARNING: "1"
    depends_on:
      database:
        condition: service_healthy
      kafka:
        condition: service_healthy
    networks:
      - chat-network
    restart: unless-stopped

  # Frontend Service
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: frontend
    ports:
      - "3000:80"
    environment:
      REACT_APP_API_URL: http://localhost:5000
    depends_on:
      - backend
    networks:
      - chat-network
    restart: unless-stopped

networks:
  chat-network:
    driver: bridge

volumes:
  mongodb-data:
    driver: local
```

### Services:

| Service       | Image                           | Port            | Description                             |
| ------------- | ------------------------------- | --------------- | --------------------------------------- |
| **zookeeper** | confluentinc/cp-zookeeper:7.4.0 | 2181 (internal) | Coordination service required for Kafka |
| **kafka**     | confluentinc/cp-kafka:7.4.0     | 9092            | Message broker service                  |
| **database**  | mongo:6.0                       | 27017           | MongoDB database                        |
| **backend**   | Custom (Node.js)                | 5000            | API and WebSocket service               |
| **frontend**  | Custom (React + Nginx)          | 3000            | Web interface                           |

---

## 📄 2. Backend Dockerfile

**Location:** `./backend/Dockerfile`

Container definition for the Node.js-based backend API.

### Contents:

```dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application code
COPY . .

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["npm", "start"]
```

### Description:

- **Base Image:** `node:18-alpine` (Node.js 18 on lightweight Alpine Linux)
- **Working Directory:** `/app`
- **Port:** 5000
- **Health Check:** Checks the `/health` endpoint every 30 seconds

---

## 📄 3. Frontend Dockerfile

**Location:** `./frontend/Dockerfile`

Container definition using multi-stage build for the React application.

### Contents:

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files to nginx
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

### Description:

- **Multi-stage Build:** In the first stage, React is built; in the second stage, only the build output is copied to Nginx
- **Build Stage:** React application is compiled with `node:18-alpine`
- **Production Stage:** Static files are served with `nginx:alpine`
- **Port:** 80

---

## 📄 4. Nginx Configuration

**Location:** `./frontend/nginx.conf`

Frontend web server configuration.

### Contents:

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
}
```

### Description:

- **SPA Routing:** React Router support with `try_files`
- **API Proxy:** `/api` requests are forwarded to the backend service
- **WebSocket Support:** With `Upgrade` and `Connection` headers
- **Gzip:** Compression enabled for better performance

---

## 📄 5. MongoDB Initialization Script

**Location:** `./mongo-init.js`

Initialization script that runs automatically when MongoDB starts for the first time.

### Contents:

```javascript
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
```

### Description:

- **Database:** `chatdb` is created
- **Collections:** `users` and `messages` collections
- **Indexes:** Username and timestamp indexes for performance
- **Sample Data:** Sample user and messages for testing

---

## 🚀 Usage

### To start all services:

```bash
docker-compose up -d
```

### To stop services:

```bash
docker-compose down
```

### To view logs:

```bash
docker-compose logs -f
```

### To rebuild:

```bash
docker-compose up -d --build
```

---

## 🌐 Access URLs

| Service     | URL                       |
| ----------- | ------------------------- |
| Frontend    | http://localhost:3000     |
| Backend API | http://localhost:5000     |
| MongoDB     | mongodb://localhost:27017 |
| Kafka       | localhost:9092            |
