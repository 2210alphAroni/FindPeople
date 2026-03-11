const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  'http://localhost:5173',
  'https://find-people-mu.vercel.app',
  process.env.CLIENT_URL,
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');
const adminRoutes = require('./routes/admin');
const groupRoutes = require('./routes/groups');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/groups', groupRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'OK', message: 'FindPeople API running' }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Atlas connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Socket.io - Real-time location & chat
const activeUsers = new Map();

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  socket.on('user:join', (userData) => {
    activeUsers.set(socket.id, {
      ...userData,
      socketId: socket.id,
      lastSeen: new Date(),
    });
    console.log(`👤 User joined: ${userData.username || 'Anonymous'}`);
  });

  socket.on('location:update', (locationData) => {
    const user = activeUsers.get(socket.id);
    if (user) {
      user.location = locationData;
      user.lastSeen = new Date();
      activeUsers.set(socket.id, user);

      const nearbyUsers = getNearbyUsers(socket.id, locationData, 500);
      socket.emit('nearby:users', nearbyUsers);

      nearbyUsers.forEach(nearUser => {
        const nearSocket = io.sockets.sockets.get(nearUser.socketId);
        if (nearSocket) {
          const theirNearby = getNearbyUsers(nearUser.socketId, nearUser.location, 500);
          nearSocket.emit('nearby:users', theirNearby);
        }
      });
    }
  });

  socket.on('message:send', (messageData) => {
    const { toSocketId, toUserId, message, fromUser } = messageData;

    let receiverSocketId = toSocketId;
    if (!receiverSocketId) {
      for (const [sid, u] of activeUsers.entries()) {
        if (u.userId === toUserId) {
          receiverSocketId = sid;
          break;
        }
      }
    }

    const msgPayload = {
      id: Date.now().toString(),
      message,
      from: fromUser,
      timestamp: new Date(),
    };

    if (receiverSocketId) {
      io.to(receiverSocketId).emit('message:receive', msgPayload);
    }
    socket.emit('message:sent', msgPayload);
  });

  socket.on('typing:start', ({ toSocketId }) => {
    const user = activeUsers.get(socket.id);
    if (toSocketId && user) {
      io.to(toSocketId).emit('typing:indicator', { from: user, isTyping: true });
    }
  });

  socket.on('typing:stop', ({ toSocketId }) => {
    const user = activeUsers.get(socket.id);
    if (toSocketId && user) {
      io.to(toSocketId).emit('typing:indicator', { from: user, isTyping: false });
    }
  });

  socket.on('disconnect', () => {
    const user = activeUsers.get(socket.id);
    if (user) {
      console.log(`👋 User disconnected: ${user.username || 'Anonymous'}`);
      activeUsers.delete(socket.id);
    }
  });
});

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getNearbyUsers(excludeSocketId, location, radius) {
  const nearby = [];
  for (const [socketId, user] of activeUsers.entries()) {
    if (socketId === excludeSocketId) continue;
    if (!user.location) continue;

    const distance = calculateDistance(
      location.lat, location.lng,
      user.location.lat, user.location.lng
    );

    if (distance <= radius) {
      nearby.push({ ...user, distance: Math.round(distance) });
    }
  }
  return nearby.sort((a, b) => a.distance - b.distance);
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 FindPeople server running on port ${PORT}`);
});