const express = require('express');
const router = express.Router();

// In-memory storage for synced contacts
const syncedContacts = new Map();

// Sync contacts
router.post('/contacts/sync', (req, res) => {
  const { userId, contacts } = req.body;
  
  if (!userId || !Array.isArray(contacts)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request'
    });
  }
  
  // Store hashed contacts
  syncedContacts.set(userId, {
    contacts,
    syncedAt: Date.now()
  });
  
  res.json({
    success: true,
    syncedCount: contacts.length,
    syncedAt: Date.now()
  });
});

// Get matched contacts (users who are on CHATR)
router.get('/contacts/matches/:userId', (req, res) => {
  const { userId } = req.params;
  
  const userContacts = syncedContacts.get(userId);
  
  if (!userContacts) {
    return res.json({
      success: true,
      matches: []
    });
  }
  
  // Mock matches (in reality would compare hashes against user database)
  const mockMatches = userContacts.contacts.slice(0, 5).map((contact, index) => ({
    contactHash: contact.phoneHash,
    userId: `user_${index}`,
    username: `User ${index}`,
    isRegistered: true
  }));
  
  res.json({
    success: true,
    matches: mockMatches
  });
});

// Update contact
router.post('/contacts/update', (req, res) => {
  const { userId, contactId, data } = req.body;
  
  res.json({
    success: true,
    message: 'Contact updated'
  });
});

module.exports = router;
