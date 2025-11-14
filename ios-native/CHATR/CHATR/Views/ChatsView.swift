import SwiftUI

struct Chat: Identifiable {
    let id: String
    let contactName: String
    let lastMessage: String
    let timestamp: Date
    let unreadCount: Int
    let isOnline: Bool
    
    var avatarInitial: String {
        String(contactName.prefix(1))
    }
}

struct ChatsView: View {
    @State private var searchQuery = ""
    @State private var chats: [Chat] = [
        Chat(id: "1", contactName: "John Doe", lastMessage: "Hey! How are you?", timestamp: Date().addingTimeInterval(-3600), unreadCount: 2, isOnline: true),
        Chat(id: "2", contactName: "Sarah Smith", lastMessage: "See you tomorrow!", timestamp: Date().addingTimeInterval(-7200), unreadCount: 0, isOnline: false),
        Chat(id: "3", contactName: "Mike Johnson", lastMessage: "Thanks for the info", timestamp: Date().addingTimeInterval(-86400), unreadCount: 1, isOnline: true),
        Chat(id: "4", contactName: "Emma Wilson", lastMessage: "Let's catch up soon", timestamp: Date().addingTimeInterval(-172800), unreadCount: 0, isOnline: false),
        Chat(id: "5", contactName: "Alex Brown", lastMessage: "👍", timestamp: Date().addingTimeInterval(-259200), unreadCount: 0, isOnline: false)
    ]
    
    var filteredChats: [Chat] {
        if searchQuery.isEmpty {
            return chats
        }
        return chats.filter { $0.contactName.localizedCaseInsensitiveContains(searchQuery) }
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.chatrBackground.ignoresSafeArea()
                
                VStack(spacing: 0) {
                    // Search bar
                    ChatrSearchBar(
                        text: $searchQuery,
                        placeholder: "Search chats..."
                    )
                    .padding()
                    
                    // Chats list
                    ScrollView {
                        LazyVStack(spacing: 4) {
                            ForEach(filteredChats) { chat in
                                ChatRow(chat: chat)
                                    .padding(.horizontal)
                            }
                        }
                        .padding(.vertical, 8)
                    }
                }
            }
            .navigationTitle("Chats")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        // Search action
                    } label: {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.chatrPrimary)
                    }
                }
            }
            .overlay(alignment: .bottomTrailing) {
                Button {
                    // New chat action
                } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(width: 56, height: 56)
                        .background(Color.chatrPrimary)
                        .clipShape(Circle())
                        .shadow(color: .chatrPrimary.opacity(0.3), radius: 8, y: 4)
                }
                .padding(.trailing, 16)
                .padding(.bottom, 80)
            }
        }
    }
}

struct ChatRow: View {
    let chat: Chat
    
    var body: some View {
        Button {
            // Navigate to chat detail
        } label: {
            HStack(spacing: 12) {
                // Avatar
                ZStack(alignment: .bottomTrailing) {
                    Circle()
                        .fill(Color.chatrPrimary.opacity(0.3))
                        .frame(width: 56, height: 56)
                        .overlay(
                            Text(chat.avatarInitial)
                                .font(.system(size: 24, weight: .bold))
                                .foregroundColor(.chatrPrimary)
                        )
                    
                    if chat.isOnline {
                        Circle()
                            .fill(Color.chatrSuccess)
                            .frame(width: 16, height: 16)
                            .overlay(
                                Circle()
                                    .stroke(Color.chatrCard, lineWidth: 2)
                            )
                    }
                }
                
                // Chat info
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(chat.contactName)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.chatrForeground)
                        
                        Spacer()
                        
                        Text(formatTimestamp(chat.timestamp))
                            .font(.system(size: 12))
                            .foregroundColor(.chatrMutedForeground)
                    }
                    
                    HStack {
                        Text(chat.lastMessage)
                            .font(.system(size: 14))
                            .foregroundColor(.chatrMutedForeground)
                            .lineLimit(1)
                        
                        Spacer()
                        
                        if chat.unreadCount > 0 {
                            Text("\(chat.unreadCount)")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(.white)
                                .frame(width: 24, height: 24)
                                .background(Color.chatrPrimary)
                                .clipShape(Circle())
                        }
                    }
                }
            }
            .padding(12)
            .background(Color.chatrCard)
            .cornerRadius(12)
        }
    }
    
    private func formatTimestamp(_ date: Date) -> String {
        let now = Date()
        let diff = now.timeIntervalSince(date)
        
        switch diff {
        case 0..<60:
            return "Just now"
        case 60..<3600:
            return "\(Int(diff / 60))m ago"
        case 3600..<86400:
            return "\(Int(diff / 3600))h ago"
        case 86400..<604800:
            return "\(Int(diff / 86400))d ago"
        default:
            let formatter = DateFormatter()
            formatter.dateFormat = "MMM dd"
            return formatter.string(from: date)
        }
    }
}
