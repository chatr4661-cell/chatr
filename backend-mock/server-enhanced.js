const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

// Import route modules
const callingRoutes = require('./calling-routes');
const contactsRoutes = require('./contacts-routes');
const notificationsRoutes = require('./notifications-routes');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// In-memory storage
const messages = new Map();
const conversations = new Map();
const userSockets = new Map();

// Mount routes
app.use('/api', callingRoutes);
app.use('/api', contactsRoutes);
app.use('/api', notificationsRoutes);

// REST API Endpoints

app.get('/api/messages/:conversationId', (req, res) => {
  const { conversationId } = req.params;
  const { limit = 50, offset = 0 } = req.query;
  
  const conversationMessages = messages.get(conversationId) || [];
  const paginatedMessages = conversationMessages.slice(
    parseInt(offset),
    parseInt(offset) + parseInt(limit)
  );
  
  res.json({
    success: true,
    messages: paginatedMessages,
    total: conversationMessages.length
  });
});

app.post('/api/messages', (req, res) => {
  const message = {
    id: Date.now().toString(),
    ...req.body,
    timestamp: Date.now(),
    status: 'SENT'
  };
  
  const conversationMessages = messages.get(message.conversationId) || [];
  conversationMessages.push(message);
  messages.set(message.conversationId, conversationMessages);
  
  // Broadcast to connected clients
  io.to(message.conversationId).emit('message', message);
  
  res.json({
    success: true,
    message
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: Date.now()
  });
});

// WebSocket Events

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  const userId = socket.handshake.auth.userId;
  if (userId) {
    userSockets.set(userId, socket.id);
  }
  
  socket.on('join_conversation', (conversationId) => {
    socket.join(conversationId);
    console.log(`User ${userId} joined conversation ${conversationId}`);
  });
  
  socket.on('send_message', (data) => {
    const message = {
      id: data.id || Date.now().toString(),
      ...data,
      timestamp: data.timestamp || Date.now(),
      status: 'SENT'
    };
    
    const conversationMessages = messages.get(message.conversationId) || [];
    conversationMessages.push(message);
    messages.set(message.conversationId, conversationMessages);
    
    io.to(message.conversationId).emit('message', message);
    
    socket.emit('message_delivered', {
      messageId: message.id,
      timestamp: Date.now()
    });
  });
  
  // WebRTC Signaling Events
  socket.on('call-offer', (data) => {
    const recipientSocket = userSockets.get(data.to);
    if (recipientSocket) {
      io.to(recipientSocket).emit('call-offer', {
        callId: data.callId,
        from: userId,
        sdp: data.sdp,
        type: data.type,
        isVideo: data.isVideo
      });
    }
  });
  
  socket.on('call-answer', (data) => {
    const recipientSocket = userSockets.get(data.to);
    if (recipientSocket) {
      io.to(recipientSocket).emit('call-answer', {
        callId: data.callId,
        from: userId,
        sdp: data.sdp,
        type: data.type
      });
    }
  });
  
  socket.on('call-candidate', (data) => {
    const recipientSocket = userSockets.get(data.to);
    if (recipientSocket) {
      io.to(recipientSocket).emit('call-candidate', {
        callId: data.callId,
        from: userId,
        candidate: data.candidate,
        sdpMid: data.sdpMid,
        sdpMLineIndex: data.sdpMLineIndex
      });
    }
  });
  
  socket.on('call-end', (data) => {
    const recipientSocket = userSockets.get(data.to);
    if (recipientSocket) {
      io.to(recipientSocket).emit('call-end', {
        callId: data.callId
      });
    }
  });
  
  socket.on('voip-call', (data) => {
    const recipientSocket = userSockets.get(data.to);
    if (recipientSocket) {
      io.to(recipientSocket).emit('voip-call', {
        callId: data.callId,
        from: userId,
        isVideo: data.isVideo
      });
    }
  });
  
  socket.on('typing_start', (data) => {
    socket.to(data.conversationId).emit('typing_start', {
      userId: userId,
      conversationId: data.conversationId
    });
  });
  
  socket.on('typing_stop', (data) => {
    socket.to(data.conversationId).emit('typing_stop', {
      userId: userId,
      conversationId: data.conversationId
    });
  });
  
  socket.on('mark_delivered', (data) => {
    io.to(data.conversationId).emit('message_delivered', {
      messageId: data.messageId,
      timestamp: Date.now()
    });
  });
  
  socket.on('mark_read', (data) => {
    data.messageIds.forEach(messageId => {
      io.to(data.conversationId).emit('message_read', {
        messageId: messageId,
        timestamp: Date.now()
      });
    });
  });
  
  socket.on('add_reaction', (data) => {
    io.to(data.conversationId).emit('reaction_added', {
      messageId: data.messageId,
      userId: userId,
      emoji: data.emoji,
      timestamp: Date.now()
    });
  });
  
  socket.on('contact-updated', (data) => {
    const recipientSocket = userSockets.get(data.to);
    if (recipientSocket) {
      io.to(recipientSocket).emit('contact-updated', data);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    if (userId) {
      userSockets.delete(userId);
      
      io.emit('user_presence', {
        userId: userId,
        isOnline: false
      });
    }
  });
  
  // Broadcast user online status
  if (userId) {
    io.emit('user_presence', {
      userId: userId,
      isOnline: true
    });
  }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`CHATR Enhanced Backend running on port ${PORT}`);
  console.log(`WebSocket server ready`);
  console.log(`REST API: http://localhost:${PORT}/api`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
