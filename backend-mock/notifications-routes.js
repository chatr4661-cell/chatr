const express = require('express');
const router = express.Router();

// In-memory storage for device tokens
const deviceTokens = new Map();

// Register device token (FCM/APNs)
router.post('/notifications/register', (req, res) => {
  const { deviceToken, platform, userId } = req.body;
  
  if (!deviceToken || !platform || !userId) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields'
    });
  }
  
  if (!deviceTokens.has(userId)) {
    deviceTokens.set(userId, []);
  }
  
  const userTokens = deviceTokens.get(userId);
  const existingToken = userTokens.find(t => t.token === deviceToken);
  
  if (!existingToken) {
    userTokens.push({
      token: deviceToken,
      platform,
      registeredAt: Date.now()
    });
  }
  
  res.json({
    success: true,
    message: 'Device token registered'
  });
});

// Register VoIP token (iOS PushKit)
router.post('/notifications/register-voip', (req, res) => {
  const { voipToken, platform, userId } = req.body;
  
  if (!voipToken || !userId) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields'
    });
  }
  
  if (!deviceTokens.has(userId)) {
    deviceTokens.set(userId, []);
  }
  
  const userTokens = deviceTokens.get(userId);
  const existingToken = userTokens.find(t => t.voipToken === voipToken);
  
  if (!existingToken) {
    userTokens.push({
      voipToken,
      platform,
      type: 'voip',
      registeredAt: Date.now()
    });
  }
  
  res.json({
    success: true,
    message: 'VoIP token registered'
  });
});

// Send notification
router.post('/notifications/send', (req, res) => {
  const { userId, notification } = req.body;
  
  const userTokens = deviceTokens.get(userId);
  
  if (!userTokens || userTokens.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'No device tokens found for user'
    });
  }
  
  // Mock sending notification
  console.log(`Sending notification to user ${userId}:`, notification);
  
  res.json({
    success: true,
    sent: userTokens.length,
    notification
  });
});

// Get user tokens
router.get('/notifications/tokens/:userId', (req, res) => {
  const { userId } = req.params;
  
  const userTokens = deviceTokens.get(userId) || [];
  
  res.json({
    success: true,
    tokens: userTokens
  });
});

module.exports = router;
