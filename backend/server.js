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
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);
const groupRoutes = require('./routes/groups');
app.use('/api/groups', groupRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'OK', message: 'FindPeople API running' }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Atlas connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Socket.io - Real-time location & chat
const activeUsers = new Map(); // socketId -> { userId, location, username, avatar, anonymous }

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // User joins with their info
  socket.on('user:join', (userData) => {
    activeUsers.set(socket.id, {
      ...userData,
      socketId: socket.id,
      lastSeen: new Date(),
    });
    console.log(`👤 User joined: ${userData.username || 'Anonymous'}`);
  });

  // Update user location
  socket.on('location:update', (locationData) => {
    const user = activeUsers.get(socket.id);
    if (user) {
      user.location = locationData;
      user.lastSeen = new Date();
      activeUsers.set(socket.id, user);

      // Find nearby users within 500 meters
      const nearbyUsers = getNearbyUsers(socket.id, locationData, 500);
      socket.emit('nearby:users', nearbyUsers);

      // Also notify all nearby users
      nearbyUsers.forEach(nearUser => {
        const nearSocket = io.sockets.sockets.get(nearUser.socketId);
        if (nearSocket) {
          const theirNearby = getNearbyUsers(nearUser.socketId, nearUser.location, 500);
          nearSocket.emit('nearby:users', theirNearby);
        }
      });
    }
  });

  // Private message
  socket.on('message:send', (messageData) => {
    const { toSocketId, toUserId, message, fromUser } = messageData;
    
    // Find receiver's socket
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

  // Typing indicator
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

  // Disconnect
  socket.on('disconnect', () => {
    const user = activeUsers.get(socket.id);
    if (user) {
      console.log(`👋 User disconnected: ${user.username || 'Anonymous'}`);
      activeUsers.delete(socket.id);
    }
  });
});

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Get nearby users within radius meters
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
      nearby.push({
        ...user,
        distance: Math.round(distance),
      });
    }
  }
  return nearby.sort((a, b) => a.distance - b.distance);
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 FindPeople server running on port ${PORT}`);
});