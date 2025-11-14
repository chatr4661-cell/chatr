import SwiftUI

struct Call: Identifiable {
    let id: String
    let contactName: String
    let callType: CallType
    let timestamp: Date
    let duration: Int
    let isMissed: Bool
    
    enum CallType {
        case voice, video
    }
    
    var avatarInitial: String {
        String(contactName.prefix(1))
    }
}

struct CallsView: View {
    @State private var selectedTab = 0
    @State private var callLogs: [Call] = [
        Call(id: "1", contactName: "John Doe", callType: .video, timestamp: Date().addingTimeInterval(-3600), duration: 1230, isMissed: false),
        Call(id: "2", contactName: "Sarah Smith", callType: .voice, timestamp: Date().addingTimeInterval(-7200), duration: 456, isMissed: true),
        Call(id: "3", contactName: "Mike Johnson", callType: .video, timestamp: Date().addingTimeInterval(-86400), duration: 2340, isMissed: false),
        Call(id: "4", contactName: "Emma Wilson", callType: .voice, timestamp: Date().addingTimeInterval(-172800), duration: 890, isMissed: false),
        Call(id: "5", contactName: "Alex Brown", callType: .video, timestamp: Date().addingTimeInterval(-259200), duration: 1567, isMissed: false),
        Call(id: "6", contactName: "Lisa Anderson", callType: .voice, timestamp: Date().addingTimeInterval(-345600), duration: 234, isMissed: true)
    ]
    
    var filteredCalls: [Call] {
        selectedTab == 1 ? callLogs.filter { $0.isMissed } : callLogs
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.chatrBackground.ignoresSafeArea()
                
                VStack(spacing: 0) {
                    // Tabs
                    HStack(spacing: 0) {
                        TabButton(title: "All", isSelected: selectedTab == 0) {
                            selectedTab = 0
                        }
                        TabButton(title: "Missed", isSelected: selectedTab == 1) {
                            selectedTab = 1
                        }
                    }
                    .padding(.horizontal)
                    
                    // Calls list
                    ScrollView {
                        LazyVStack(spacing: 4) {
                            ForEach(filteredCalls) { call in
                                CallLogRow(call: call)
                                    .padding(.horizontal)
                            }
                        }
                        .padding(.vertical, 8)
                    }
                }
            }
            .navigationTitle("Calls")
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
                    // New call action
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

struct TabButton: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Text(title)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(isSelected ? .chatrPrimary : .chatrMutedForeground)
                
                Rectangle()
                    .fill(isSelected ? Color.chatrPrimary : Color.clear)
                    .frame(height: 2)
            }
            .frame(maxWidth: .infinity)
        }
    }
}

struct CallLogRow: View {
    let call: Call
    
    var body: some View {
        Button {
            // Navigate to call detail
        } label: {
            HStack(spacing: 12) {
                // Avatar
                Circle()
                    .fill(Color.chatrPrimary.opacity(0.3))
                    .frame(width: 56, height: 56)
                    .overlay(
                        Text(call.avatarInitial)
                            .font(.system(size: 24, weight: .bold))
                            .foregroundColor(.chatrPrimary)
                    )
                
                // Call info
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        Image(systemName: call.callType == .video ? "video.fill" : "phone.fill")
                            .font(.system(size: 14))
                            .foregroundColor(call.isMissed ? .chatrDestructive : .chatrMutedForeground)
                        
                        Text(call.contactName)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(call.isMissed ? .chatrDestructive : .chatrForeground)
                    }
                    
                    Text(formatCallInfo(call))
                        .font(.system(size: 12))
                        .foregroundColor(.chatrMutedForeground)
                }
                
                Spacer()
                
                // Call back button
                Button {
                    // Call back action
                } label: {
                    Image(systemName: call.callType == .video ? "video.fill" : "phone.fill")
                        .font(.system(size: 20))
                        .foregroundColor(.chatrPrimary)
                        .frame(width: 40, height: 40)
                }
            }
            .padding(12)
            .background(Color.chatrCard)
            .cornerRadius(12)
        }
    }
    
    private func formatCallInfo(_ call: Call) -> String {
        let timestamp = formatTimestamp(call.timestamp)
        let duration = call.isMissed ? "Missed" : formatDuration(call.duration)
        return "\(timestamp) • \(duration)"
    }
    
    private func formatDuration(_ seconds: Int) -> String {
        let minutes = seconds / 60
        let secs = seconds % 60
        return minutes > 0 ? "\(minutes)m \(secs)s" : "\(secs)s"
    }
    
    private func formatTimestamp(_ date: Date) -> String {
        let diff = Date().timeIntervalSince(date)
        
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
