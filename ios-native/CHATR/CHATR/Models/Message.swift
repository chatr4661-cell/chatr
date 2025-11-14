import Foundation
import Combine

struct Message: Identifiable, Codable {
    let id: String
    let conversationId: String
    let senderId: String
    let senderName: String
    let content: String
    let type: MessageType
    let timestamp: Date
    var status: MessageStatus
    let mediaUrl: String?
    let thumbnailUrl: String?
    let mediaDuration: Int?
    var reactions: [Reaction]
    let replyToId: String?
    var isEdited: Bool
    let editedAt: Date?
    var deliveredAt: Date?
    var readAt: Date?
    let localPath: String?
    var uploadProgress: Int
    
    enum MessageType: String, Codable {
        case text = "TEXT"
        case image = "IMAGE"
        case video = "VIDEO"
        case file = "FILE"
        case voiceNote = "VOICE_NOTE"
        case system = "SYSTEM"
    }
    
    enum MessageStatus: String, Codable {
        case pending = "PENDING"
        case sent = "SENT"
        case delivered = "DELIVERED"
        case read = "READ"
        case failed = "FAILED"
    }
}

struct Reaction: Codable, Hashable {
    let userId: String
    let emoji: String
    let timestamp: Date
}
