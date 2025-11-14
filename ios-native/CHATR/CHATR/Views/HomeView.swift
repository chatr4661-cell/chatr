import SwiftUI

struct HomeView: View {
    @State private var searchQuery = ""
    @Binding var selectedTab: ChatrBottomNav.Tab
    
    let ecosystemItems = [
        ("AI Assistant", "sparkles"),
        ("Universal Search", "magnifyingglass"),
        ("Video Call", "video.fill"),
        ("Voice Call", "phone.fill"),
        ("Messages", "message.fill"),
        ("Location Share", "location.fill"),
        ("File Transfer", "folder.fill"),
        ("Voice Notes", "mic.fill"),
        ("Groups", "person.3.fill"),
        ("Status", "circle.hexagongrid.fill"),
        ("Wallet", "wallet.pass.fill"),
        ("Settings", "gearshape.fill")
    ]
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.chatrBackground.ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 0) {
                        // Header gradient section
                        ZStack {
                            LinearGradient(
                                colors: [
                                    Color.chatrPrimary,
                                    Color.chatrAccent
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                            .frame(height: 180)
                            
                            VStack(spacing: 8) {
                                Text("Welcome Back!")
                                    .font(.system(size: 32, weight: .bold))
                                    .foregroundColor(.white)
                                
                                Text("Explore your connected ecosystem")
                                    .font(.system(size: 14))
                                    .foregroundColor(.white.opacity(0.9))
                            }
                        }
                        
                        VStack(spacing: 24) {
                            // Search bar
                            ChatrSearchBar(
                                text: $searchQuery,
                                placeholder: "Search features, contacts, messages..."
                            )
                            .padding(.horizontal)
                            .padding(.top, 24)
                            
                            // Ecosystem section
                            VStack(alignment: .leading, spacing: 16) {
                                Text("Ecosystem")
                                    .font(.system(size: 20, weight: .bold))
                                    .foregroundColor(.chatrForeground)
                                    .padding(.horizontal)
                                
                                LazyVGrid(
                                    columns: [
                                        GridItem(.flexible(), spacing: 12),
                                        GridItem(.flexible(), spacing: 12)
                                    ],
                                    spacing: 12
                                ) {
                                    ForEach(ecosystemItems, id: \.0) { item in
                                        EcosystemCard(
                                            title: item.0,
                                            icon: item.1,
                                            action: {
                                                handleNavigation(for: item.0)
                                            }
                                        )
                                    }
                                }
                                .padding(.horizontal)
                            }
                        }
                        
                        Spacer(minLength: 24)
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("CHATR+")
                            .font(.system(size: 24, weight: .bold))
                            .foregroundColor(.chatrForeground)
                        Text("Your All-in-One Ecosystem")
                            .font(.system(size: 12))
                            .foregroundColor(.chatrMutedForeground)
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        // Navigate to profile
                    } label: {
                        Image(systemName: "person.circle.fill")
                            .font(.system(size: 28))
                            .foregroundColor(.chatrPrimary)
                    }
                }
            }
        }
    }
    
    private func handleNavigation(for item: String) {
        switch item {
        case "Messages":
            selectedTab = .chats
        case "Voice Call", "Video Call":
            selectedTab = .calls
        case "Settings":
            selectedTab = .settings
        default:
            // Handle other navigation
            break
        }
    }
}
