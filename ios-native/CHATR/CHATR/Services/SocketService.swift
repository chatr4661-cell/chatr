import Foundation
import SocketIO

enum SocketEvent {
    case messageReceived([String: Any])
    case messageDelivered(messageId: String, timestamp: Date)
    case messageRead(messageId: String, timestamp: Date)
    case typingStarted(userId: String, conversationId: String)
    case typingStopped(userId: String, conversationId: String)
    case userPresence(userId: String, isOnline: Bool)
    case error(String)
}

class SocketService: ObservableObject {
    static let shared = SocketService()
    
    private var manager: SocketManager?
    private var socket: SocketIOClient?
    
    @Published var isConnected = false
    @Published var events: [SocketEvent] = []
    
    private let socketURL = "http://localhost:3000" // Replace with actual URL
    
    private init() {}
    
    func connect(userId: String, token: String) {
        manager = SocketManager(
            socketURL: URL(string: socketURL)!,
            config: [
                .log(false),
                .compress,
                .reconnects(true),
                .reconnectAttempts(5),
                .reconnectWait(1),
                .connectParams(["userId": userId, "token": token])
            ]
        )
        
        socket = manager?.defaultSocket
        
        setupHandlers()
        socket?.connect()
    }
    
    private func setupHandlers() {
        socket?.on(clientEvent: .connect) { [weak self] data, ack in
            print("Socket connected")
            DispatchQueue.main.async {
                self?.isConnected = true
            }
        }
        
        socket?.on(clientEvent: .disconnect) { [weak self] data, ack in
            print("Socket disconnected")
            DispatchQueue.main.async {
                self?.isConnected = false
            }
        }
        
        socket?.on(clientEvent: .error) { [weak self] data, ack in
            print("Socket error: \(data)")
            self?.events.append(.error("Connection failed"))
        }
        
        socket?.on("message") { [weak self] data, ack in
            guard let messageData = data.first as? [String: Any] else { return }
            print("Message received: \(messageData)")
            self?.events.append(.messageReceived(messageData))
        }
        
        socket?.on("message_delivered") { [weak self] data, ack in
            guard let deliveryData = data.first as? [String: Any],
                  let messageId = deliveryData["messageId"] as? String,
                  let timestamp = deliveryData["timestamp"] as? TimeInterval else { return }
            
            self?.events.append(.messageDelivered(
                messageId: messageId,
                timestamp: Date(timeIntervalSince1970: timestamp / 1000)
            ))
        }
        
        socket?.on("message_read") { [weak self] data, ack in
            guard let readData = data.first as? [String: Any],
                  let messageId = readData["messageId"] as? String,
                  let timestamp = readData["timestamp"] as? TimeInterval else { return }
            
            self?.events.append(.messageRead(
                messageId: messageId,
                timestamp: Date(timeIntervalSince1970: timestamp / 1000)
            ))
        }
        
        socket?.on("typing_start") { [weak self] data, ack in
            guard let typingData = data.first as? [String: Any],
                  let userId = typingData["userId"] as? String,
                  let conversationId = typingData["conversationId"] as? String else { return }
            
            self?.events.append(.typingStarted(userId: userId, conversationId: conversationId))
        }
        
        socket?.on("typing_stop") { [weak self] data, ack in
            guard let typingData = data.first as? [String: Any],
                  let userId = typingData["userId"] as? String,
                  let conversationId = typingData["conversationId"] as? String else { return }
            
            self?.events.append(.typingStopped(userId: userId, conversationId: conversationId))
        }
        
        socket?.on("user_presence") { [weak self] data, ack in
            guard let presenceData = data.first as? [String: Any],
                  let userId = presenceData["userId"] as? String,
                  let isOnline = presenceData["isOnline"] as? Bool else { return }
            
            self?.events.append(.userPresence(userId: userId, isOnline: isOnline))
        }
    }
    
    func disconnect() {
        socket?.disconnect()
        socket = nil
        manager = nil
        isConnected = false
    }
    
    func sendMessage(_ message: [String: Any]) {
        socket?.emit("send_message", message)
    }
    
    func sendTyping(conversationId: String, isTyping: Bool) {
        let event = isTyping ? "typing_start" : "typing_stop"
        socket?.emit(event, ["conversationId": conversationId])
    }
    
    func markAsDelivered(messageId: String) {
        socket?.emit("mark_delivered", ["messageId": messageId])
    }
    
    func markAsRead(messageIds: [String]) {
        socket?.emit("mark_read", ["messageIds": messageIds])
    }
    
    func sendReaction(messageId: String, emoji: String) {
        socket?.emit("add_reaction", [
            "messageId": messageId,
            "emoji": emoji
        ])
    }
}
