import SwiftUI

@main
struct CHATRApp: App {
    @StateObject private var appState = AppState()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .preferredColorScheme(.dark)
        }
    }
}

class AppState: ObservableObject {
    @Published var selectedTab: ChatrBottomNav.Tab = .chats
    @Published var isAuthenticated = false
    @Published var currentUser: User?
}

struct User: Identifiable {
    let id: String
    let name: String
    let email: String
    let avatarUrl: String?
}
