const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

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

// In-memory storage (replace with actual database)
const messages = new Map();
const conversations = new Map();
const userSockets = new Map();

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
    
    // Store message
    const conversationMessages = messages.get(message.conversationId) || [];
    conversationMessages.push(message);
    messages.set(message.conversationId, conversationMessages);
    
    // Broadcast to conversation
    io.to(message.conversationId).emit('message', message);
    
    // Send delivery confirmation back to sender
    socket.emit('message_delivered', {
      messageId: message.id,
      timestamp: Date.now()
    });
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
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    if (userId) {
      userSockets.delete(userId);
      
      // Broadcast user offline status
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
  console.log(`CHATR Mock Backend running on port ${PORT}`);
  console.log(`WebSocket server ready`);
});
