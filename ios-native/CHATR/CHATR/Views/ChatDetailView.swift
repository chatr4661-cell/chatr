import SwiftUI
import PhotosUI

struct ChatDetailView: View {
    let conversationId: String
    let contactName: String
    let currentUserId: String
    
    @State private var messageText = ""
    @State private var isTyping = false
    @State private var showReactionMenu: String? = nil
    @State private var selectedImage: PhotosPickerItem? = nil
    @State private var messages: [Message] = []
    
    @Environment(\.presentationMode) var presentationMode
    
    var body: some View {
        VStack(spacing: 0) {
            // Messages list
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 8) {
                        ForEach(mockMessages) { message in
                            MessageBubbleView(
                                message: message,
                                isCurrentUser: message.senderId == currentUserId,
                                onLongPress: { showReactionMenu = message.id }
                            )
                            .id(message.id)
                        }
                    }
                    .padding()
                }
                .background(Color.chatrBackground)
                .onAppear {
                    if let lastMessage = mockMessages.last {
                        proxy.scrollTo(lastMessage.id, anchor: .bottom)
                    }
                }
            }
            
            // Input bar
            MessageInputBar(
                messageText: $messageText,
                onSend: sendMessage,
                onAttachment: { selectedImage = PhotosPickerItem() },
                onVoiceNote: { /* Handle voice note */ }
            )
        }
        .navigationTitle(contactName)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                HStack {
                    Button {
                        // Voice call
                    } label: {
                        Image(systemName: "phone.fill")
                            .foregroundColor(.chatrPrimary)
                    }
                    
                    Button {
                        // Video call
                    } label: {
                        Image(systemName: "video.fill")
                            .foregroundColor(.chatrPrimary)
                    }
                }
            }
        }
        .sheet(item: $showReactionMenu) { messageId in
            ReactionMenuView(
                onReactionSelect: { emoji in
                    // Add reaction
                    showReactionMenu = nil
                }
            )
        }
    }
    
    private var mockMessages: [Message] {
        [
            Message(
                id: "1",
                conversationId: conversationId,
                senderId: "other",
                senderName: contactName,
                content: "Hey! How are you doing?",
                type: .text,
                timestamp: Date().addingTimeInterval(-3600),
                status: .read,
                mediaUrl: nil,
                thumbnailUrl: nil,
                mediaDuration: nil,
                reactions: [],
                replyToId: nil,
                isEdited: false,
                editedAt: nil,
                deliveredAt: nil,
                readAt: nil,
                localPath: nil,
                uploadProgress: 0
            ),
            Message(
                id: "2",
                conversationId: conversationId,
                senderId: currentUserId,
                senderName: "You",
                content: "I'm doing great! Thanks for asking 😊",
                type: .text,
                timestamp: Date().addingTimeInterval(-3500),
                status: .read,
                mediaUrl: nil,
                thumbnailUrl: nil,
                mediaDuration: nil,
                reactions: [],
                replyToId: nil,
                isEdited: false,
                editedAt: nil,
                deliveredAt: nil,
                readAt: nil,
                localPath: nil,
                uploadProgress: 0
            ),
            Message(
                id: "3",
                conversationId: conversationId,
                senderId: "other",
                senderName: contactName,
                content: "Want to catch up later?",
                type: .text,
                timestamp: Date().addingTimeInterval(-60),
                status: .delivered,
                mediaUrl: nil,
                thumbnailUrl: nil,
                mediaDuration: nil,
                reactions: [],
                replyToId: nil,
                isEdited: false,
                editedAt: nil,
                deliveredAt: nil,
                readAt: nil,
                localPath: nil,
                uploadProgress: 0
            )
        ]
    }
    
    private func sendMessage() {
        guard !messageText.isEmpty else { return }
        
        let newMessage = Message(
            id: UUID().uuidString,
            conversationId: conversationId,
            senderId: currentUserId,
            senderName: "You",
            content: messageText,
            type: .text,
            timestamp: Date(),
            status: .pending,
            mediaUrl: nil,
            thumbnailUrl: nil,
            mediaDuration: nil,
            reactions: [],
            replyToId: nil,
            isEdited: false,
            editedAt: nil,
            deliveredAt: nil,
            readAt: nil,
            localPath: nil,
            uploadProgress: 0
        )
        
        messages.append(newMessage)
        messageText = ""
    }
}

struct MessageBubbleView: View {
    let message: Message
    let isCurrentUser: Bool
    let onLongPress: () -> Void
    
    var body: some View {
        HStack {
            if isCurrentUser { Spacer() }
            
            VStack(alignment: isCurrentUser ? .trailing : .leading, spacing: 4) {
                Text(message.content)
                    .padding(12)
                    .background(isCurrentUser ? Color.chatrPrimary : Color.chatrCard)
                    .foregroundColor(isCurrentUser ? .white : .chatrForeground)
                    .cornerRadius(16, corners: isCurrentUser ? 
                        [.topLeft, .topRight, .bottomLeft] : 
                        [.topLeft, .topRight, .bottomRight]
                    )
                
                HStack(spacing: 4) {
                    Text(formatTime(message.timestamp))
                        .font(.system(size: 11))
                        .foregroundColor(.chatrMutedForeground)
                    
                    if isCurrentUser {
                        Image(systemName: statusIcon(for: message.status))
                            .font(.system(size: 12))
                            .foregroundColor(message.status == .read ? .chatrSuccess : .chatrMutedForeground)
                    }
                    
                    if message.isEdited {
                        Text("edited")
                            .font(.system(size: 11))
                            .foregroundColor(.chatrMutedForeground)
                    }
                }
                
                if !message.reactions.isEmpty {
                    HStack(spacing: 4) {
                        ForEach(Dictionary(grouping: message.reactions, by: { $0.emoji }).sorted(by: { $0.key < $1.key }), id: \.key) { emoji, reactions in
                            Text("\(emoji) \(reactions.count)")
                                .font(.system(size: 12))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.chatrMuted)
                                .cornerRadius(12)
                        }
                    }
                }
            }
            .onLongPressGesture {
                onLongPress()
            }
            
            if !isCurrentUser { Spacer() }
        }
    }
    
    private func statusIcon(for status: Message.MessageStatus) -> String {
        switch status {
        case .pending: return "clock"
        case .sent: return "checkmark"
        case .delivered: return "checkmark.circle"
        case .read: return "checkmark.circle.fill"
        case .failed: return "exclamationmark.circle"
        }
    }
    
    private func formatTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        return formatter.string(from: date)
    }
}

struct MessageInputBar: View {
    @Binding var messageText: String
    let onSend: () -> Void
    let onAttachment: () -> Void
    let onVoiceNote: () -> Void
    
    var body: some View {
        HStack(spacing: 8) {
            Button(action: onAttachment) {
                Image(systemName: "paperclip")
                    .foregroundColor(.chatrPrimary)
            }
            
            TextField("Type a message...", text: $messageText)
                .padding(10)
                .background(Color.chatrCard)
                .cornerRadius(24)
            
            if messageText.isEmpty {
                Button(action: onVoiceNote) {
                    Image(systemName: "mic.fill")
                        .foregroundColor(.chatrPrimary)
                }
            } else {
                Button(action: onSend) {
                    Image(systemName: "paperplane.fill")
                        .foregroundColor(.chatrPrimary)
                }
            }
        }
        .padding()
        .background(Color.chatrBackgroundSecondary)
    }
}

struct ReactionMenuView: View {
    let onReactionSelect: (String) -> Void
    let reactions = ["❤️", "👍", "😂", "😮", "😢", "🙏"]
    
    var body: some View {
        VStack {
            Text("React")
                .font(.headline)
                .padding()
            
            HStack(spacing: 20) {
                ForEach(reactions, id: \.self) { emoji in
                    Button {
                        onReactionSelect(emoji)
                    } label: {
                        Text(emoji)
                            .font(.system(size: 40))
                    }
                }
            }
            .padding()
        }
        .presentationDetents([.height(200)])
    }
}

extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape(RoundedCorner(radius: radius, corners: corners))
    }
}

struct RoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        return Path(path.cgPath)
    }
}

extension String: Identifiable {
    public var id: String { self }
}
