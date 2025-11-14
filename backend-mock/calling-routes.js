const express = require('express');
const router = express.Router();

// In-memory storage for calls
const activeCalls = new Map();
const callHistory = [];

// Initiate a call
router.post('/calls/initiate', (req, res) => {
  const { callId, fromUserId, toUserId, isVideo } = req.body;
  
  const call = {
    callId,
    fromUserId,
    toUserId,
    isVideo,
    status: 'initiating',
    startTime: Date.now()
  };
  
  activeCalls.set(callId, call);
  
  res.json({
    success: true,
    call
  });
});

// Send call offer
router.post('/calls/offer', (req, res) => {
  const { callId, sdp, from, to } = req.body;
  
  if (!activeCalls.has(callId)) {
    return res.status(404).json({
      success: false,
      error: 'Call not found'
    });
  }
  
  const call = activeCalls.get(callId);
  call.offer = { sdp, from, to };
  call.status = 'ringing';
  
  res.json({
    success: true,
    call
  });
});

// Send call answer
router.post('/calls/answer', (req, res) => {
  const { callId, sdp, from, to } = req.body;
  
  if (!activeCalls.has(callId)) {
    return res.status(404).json({
      success: false,
      error: 'Call not found'
    });
  }
  
  const call = activeCalls.get(callId);
  call.answer = { sdp, from, to };
  call.status = 'connected';
  call.connectTime = Date.now();
  
  res.json({
    success: true,
    call
  });
});

// Send ICE candidate
router.post('/calls/candidate', (req, res) => {
  const { callId, candidate, from, to } = req.body;
  
  if (!activeCalls.has(callId)) {
    return res.status(404).json({
      success: false,
      error: 'Call not found'
    });
  }
  
  res.json({
    success: true,
    message: 'Candidate received'
  });
});

// End call
router.post('/calls/end', (req, res) => {
  const { callId } = req.body;
  
  if (!activeCalls.has(callId)) {
    return res.status(404).json({
      success: false,
      error: 'Call not found'
    });
  }
  
  const call = activeCalls.get(callId);
  call.status = 'ended';
  call.endTime = Date.now();
  call.duration = call.connectTime ? call.endTime - call.connectTime : 0;
  
  callHistory.push(call);
  activeCalls.delete(callId);
  
  res.json({
    success: true,
    call
  });
});

// Get call history
router.get('/calls/history/:userId', (req, res) => {
  const { userId } = req.params;
  
  const userCalls = callHistory.filter(
    call => call.fromUserId === userId || call.toUserId === userId
  );
  
  res.json({
    success: true,
    calls: userCalls
  });
});

module.exports = router;
