package com.chatr.app.viewmodel

import com.chatr.app.data.local.entity.ChatEntity
import com.chatr.app.data.local.entity.MessageEntity
import com.chatr.app.data.repository.ChatRepository
import com.chatr.app.data.repository.MessagesRepository
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import java.util.UUID

/**
 * Unit tests for ChatViewModel
 */
@OptIn(ExperimentalCoroutinesApi::class)
class ChatViewModelTest {
    
    private val testDispatcher = StandardTestDispatcher()
    private lateinit var chatRepository: ChatRepository
    private lateinit var messagesRepository: MessagesRepository
    private lateinit var viewModel: ChatViewModel
    
    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        chatRepository = mockk(relaxed = true)
        messagesRepository = mockk(relaxed = true)
        viewModel = ChatViewModel(chatRepository, messagesRepository)
    }
    
    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }
    
    @Test
    fun `loadChats fetches chats from repository`() = runTest {
        val mockChats = listOf(
            ChatEntity(
                id = UUID.randomUUID().toString(),
                participantId = "user1",
                participantName = "Test User",
                lastMessage = "Hello",
                lastMessageTime = System.currentTimeMillis(),
                unreadCount = 1,
                isGroup = false
            )
        )
        coEvery { chatRepository.getChats() } returns flowOf(mockChats)
        
        viewModel.loadChats()
        testDispatcher.scheduler.advanceUntilIdle()
        
        val chats = viewModel.chats.first()
        assertEquals(1, chats.size)
        assertEquals("Test User", chats[0].participantName)
    }
    
    @Test
    fun `loadMessages fetches messages for conversation`() = runTest {
        val conversationId = UUID.randomUUID().toString()
        val mockMessages = listOf(
            MessageEntity(
                id = UUID.randomUUID().toString(),
                conversationId = conversationId,
                senderId = "user1",
                content = "Hello",
                timestamp = System.currentTimeMillis(),
                isRead = false,
                isSent = true,
                status = "sent"
            )
        )
        coEvery { messagesRepository.getMessages(conversationId) } returns flowOf(mockMessages)
        
        viewModel.loadMessages(conversationId)
        testDispatcher.scheduler.advanceUntilIdle()
        
        val messages = viewModel.messages.first()
        assertEquals(1, messages.size)
        assertEquals("Hello", messages[0].content)
    }
    
    @Test
    fun `sendMessage calls repository and updates state`() = runTest {
        val conversationId = UUID.randomUUID().toString()
        val content = "Test message"
        
        coEvery { messagesRepository.sendMessage(conversationId, content) } returns Result.success(Unit)
        
        viewModel.sendMessage(conversationId, content)
        testDispatcher.scheduler.advanceUntilIdle()
        
        coVerify { messagesRepository.sendMessage(conversationId, content) }
    }
    
    @Test
    fun `markAsRead updates message read status`() = runTest {
        val messageId = UUID.randomUUID().toString()
        
        coEvery { messagesRepository.markAsRead(messageId) } returns Result.success(Unit)
        
        viewModel.markAsRead(messageId)
        testDispatcher.scheduler.advanceUntilIdle()
        
        coVerify { messagesRepository.markAsRead(messageId) }
    }
    
    @Test
    fun `deleteMessage removes message from repository`() = runTest {
        val messageId = UUID.randomUUID().toString()
        
        coEvery { messagesRepository.deleteMessage(messageId) } returns Result.success(Unit)
        
        viewModel.deleteMessage(messageId)
        testDispatcher.scheduler.advanceUntilIdle()
        
        coVerify { messagesRepository.deleteMessage(messageId) }
    }
    
    @Test
    fun `setTyping updates typing state`() = runTest {
        val conversationId = UUID.randomUUID().toString()
        
        viewModel.setTyping(conversationId, true)
        testDispatcher.scheduler.advanceUntilIdle()
        
        val isTyping = viewModel.isTyping.first()
        assertTrue(isTyping)
    }
    
    @Test
    fun `empty messages state when no conversation loaded`() = runTest {
        val messages = viewModel.messages.first()
        assertTrue(messages.isEmpty())
    }
}
