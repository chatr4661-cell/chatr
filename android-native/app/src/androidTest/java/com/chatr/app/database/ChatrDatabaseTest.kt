package com.chatr.app.database

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.chatr.app.data.local.ChatrDatabase
import com.chatr.app.data.local.dao.ChatDao
import com.chatr.app.data.local.dao.MessageDao
import com.chatr.app.data.local.dao.ContactDao
import com.chatr.app.data.local.entity.ChatEntity
import com.chatr.app.data.local.entity.MessageEntity
import com.chatr.app.data.local.entity.ContactEntity
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.util.UUID

/**
 * Instrumented tests for Room database
 */
@RunWith(AndroidJUnit4::class)
class ChatrDatabaseTest {
    
    private lateinit var database: ChatrDatabase
    private lateinit var chatDao: ChatDao
    private lateinit var messageDao: MessageDao
    private lateinit var contactDao: ContactDao
    
    @Before
    fun setup() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        database = Room.inMemoryDatabaseBuilder(
            context,
            ChatrDatabase::class.java
        ).allowMainThreadQueries().build()
        
        chatDao = database.chatDao()
        messageDao = database.messageDao()
        contactDao = database.contactDao()
    }
    
    @After
    fun tearDown() {
        database.close()
    }
    
    // Chat DAO Tests
    @Test
    fun insertAndGetChat() = runBlocking {
        val chat = createTestChat()
        chatDao.insert(chat)
        
        val chats = chatDao.getAllChats().first()
        assertEquals(1, chats.size)
        assertEquals(chat.id, chats[0].id)
    }
    
    @Test
    fun getChatById() = runBlocking {
        val chat = createTestChat()
        chatDao.insert(chat)
        
        val retrieved = chatDao.getChatById(chat.id)
        assertNotNull(retrieved)
        assertEquals(chat.participantName, retrieved?.participantName)
    }
    
    @Test
    fun updateChat() = runBlocking {
        val chat = createTestChat()
        chatDao.insert(chat)
        
        val updatedChat = chat.copy(lastMessage = "Updated message")
        chatDao.update(updatedChat)
        
        val retrieved = chatDao.getChatById(chat.id)
        assertEquals("Updated message", retrieved?.lastMessage)
    }
    
    @Test
    fun deleteChat() = runBlocking {
        val chat = createTestChat()
        chatDao.insert(chat)
        chatDao.delete(chat)
        
        val chats = chatDao.getAllChats().first()
        assertTrue(chats.isEmpty())
    }
    
    // Message DAO Tests
    @Test
    fun insertAndGetMessages() = runBlocking {
        val conversationId = UUID.randomUUID().toString()
        val message1 = createTestMessage(conversationId)
        val message2 = createTestMessage(conversationId)
        
        messageDao.insert(message1)
        messageDao.insert(message2)
        
        val messages = messageDao.getMessagesByConversation(conversationId).first()
        assertEquals(2, messages.size)
    }
    
    @Test
    fun markMessageAsRead() = runBlocking {
        val message = createTestMessage()
        messageDao.insert(message)
        
        messageDao.markAsRead(message.id)
        
        val retrieved = messageDao.getMessageById(message.id)
        assertTrue(retrieved?.isRead ?: false)
    }
    
    @Test
    fun deleteMessage() = runBlocking {
        val message = createTestMessage()
        messageDao.insert(message)
        messageDao.delete(message)
        
        val retrieved = messageDao.getMessageById(message.id)
        assertNull(retrieved)
    }
    
    @Test
    fun getUnreadCount() = runBlocking {
        val conversationId = UUID.randomUUID().toString()
        val unreadMessage = createTestMessage(conversationId, isRead = false)
        val readMessage = createTestMessage(conversationId, isRead = true)
        
        messageDao.insert(unreadMessage)
        messageDao.insert(readMessage)
        
        val count = messageDao.getUnreadCount(conversationId)
        assertEquals(1, count)
    }
    
    // Contact DAO Tests
    @Test
    fun insertAndGetContacts() = runBlocking {
        val contact = createTestContact()
        contactDao.insert(contact)
        
        val contacts = contactDao.getAllContacts().first()
        assertEquals(1, contacts.size)
        assertEquals(contact.name, contacts[0].name)
    }
    
    @Test
    fun getRegisteredContacts() = runBlocking {
        val registered = createTestContact(isRegistered = true)
        val notRegistered = createTestContact(isRegistered = false)
        
        contactDao.insert(registered)
        contactDao.insert(notRegistered)
        
        val registeredContacts = contactDao.getRegisteredContacts().first()
        assertEquals(1, registeredContacts.size)
        assertTrue(registeredContacts[0].isRegistered)
    }
    
    @Test
    fun searchContacts() = runBlocking {
        val contact1 = createTestContact().copy(name = "Alice Smith")
        val contact2 = createTestContact().copy(name = "Bob Jones")
        
        contactDao.insert(contact1)
        contactDao.insert(contact2)
        
        val results = contactDao.searchContacts("Alice").first()
        assertEquals(1, results.size)
        assertEquals("Alice Smith", results[0].name)
    }
    
    // Helper functions
    private fun createTestChat(
        id: String = UUID.randomUUID().toString()
    ) = ChatEntity(
        id = id,
        participantId = UUID.randomUUID().toString(),
        participantName = "Test User",
        participantAvatar = null,
        lastMessage = "Hello",
        lastMessageTime = System.currentTimeMillis(),
        unreadCount = 0,
        isGroup = false,
        groupName = null,
        isPinned = false,
        isMuted = false,
        isArchived = false
    )
    
    private fun createTestMessage(
        conversationId: String = UUID.randomUUID().toString(),
        isRead: Boolean = false
    ) = MessageEntity(
        id = UUID.randomUUID().toString(),
        conversationId = conversationId,
        senderId = UUID.randomUUID().toString(),
        content = "Test message",
        timestamp = System.currentTimeMillis(),
        isRead = isRead,
        isSent = true,
        status = "sent",
        messageType = "text",
        mediaUrl = null,
        thumbnailUrl = null,
        replyToId = null,
        isEdited = false,
        isDeleted = false,
        reactions = null
    )
    
    private fun createTestContact(
        isRegistered: Boolean = true
    ) = ContactEntity(
        id = UUID.randomUUID().toString(),
        userId = if (isRegistered) UUID.randomUUID().toString() else null,
        name = "Test Contact",
        phoneNumber = "+919999999999",
        avatarUrl = null,
        isRegistered = isRegistered,
        isFavorite = false,
        isBlocked = false,
        lastSeen = null
    )
}
