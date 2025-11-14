import SwiftUI

struct ChatrBottomNav: View {
    @Binding var selectedTab: Tab
    
    enum Tab: String, CaseIterable {
        case contacts = "Contacts"
        case calls = "Calls"
        case chats = "Chats"
        case settings = "Settings"
        
        var icon: String {
            switch self {
            case .contacts: return "person.2.fill"
            case .calls: return "phone.fill"
            case .chats: return "message.fill"
            case .settings: return "gearshape.fill"
            }
        }
    }
    
    var body: some View {
        HStack(spacing: 0) {
            ForEach(Tab.allCases, id: \.self) { tab in
                Button {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                        selectedTab = tab
                    }
                } label: {
                    VStack(spacing: 4) {
                        Image(systemName: tab.icon)
                            .font(.system(size: 24))
                            .foregroundColor(selectedTab == tab ? .chatrPrimary : .chatrMutedForeground)
                        
                        Text(tab.rawValue)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(selectedTab == tab ? .chatrPrimary : .chatrMutedForeground)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                }
            }
        }
        .frame(height: 60)
        .background(Color.chatrBackgroundSecondary)
        .shadow(color: .black.opacity(0.1), radius: 8, y: -2)
    }
}
