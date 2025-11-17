import SwiftUI

struct ContentView: View {
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        ZStack {
            Color.chatrBackground.ignoresSafeArea()
            
            // Main content
            TabView(selection: $appState.selectedTab) {
                ContactsView()
                    .tag(ChatrBottomNav.Tab.contacts)
                
                CallsView()
                    .tag(ChatrBottomNav.Tab.calls)
                
                Group {
                    if appState.selectedTab == .chats {
                        ChatsView()
                    } else {
                        HomeView(selectedTab: $appState.selectedTab)
                    }
                }
                .tag(ChatrBottomNav.Tab.chats)
                
                SettingsView()
                    .tag(ChatrBottomNav.Tab.settings)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
        }
    }
}

// Placeholder views for other tabs
struct ContactsView: View {
    var body: some View {
        NavigationView {
            ZStack {
                Color.chatrBackground.ignoresSafeArea()
                Text("Contacts")
                    .foregroundColor(.chatrForeground)
            }
            .navigationTitle("Contacts")
        }
    }
}

struct CallsView: View {
    var body: some View {
        NavigationView {
            ZStack {
                Color.chatrBackground.ignoresSafeArea()
                Text("Calls")
                    .foregroundColor(.chatrForeground)
            }
            .navigationTitle("Calls")
        }
    }
}

struct SettingsView: View {
    var body: some View {
        NavigationView {
            ZStack {
                Color.chatrBackground.ignoresSafeArea()
                Text("Settings")
                    .foregroundColor(.chatrForeground)
            }
            .navigationTitle("Settings")
        }
    }
}
