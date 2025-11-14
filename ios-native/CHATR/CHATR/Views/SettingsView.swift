import SwiftUI

struct SettingsView: View {
    @State private var notificationsEnabled = true
    @State private var darkModeEnabled = true
    @State private var autoDownloadMedia = false
    @State private var locationSharingEnabled = true
    @State private var showLogoutDialog = false
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.chatrBackground.ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 24) {
                        // Profile section
                        Button {
                            // Navigate to profile
                        } label: {
                            HStack(spacing: 16) {
                                Circle()
                                    .fill(Color.chatrPrimary.opacity(0.3))
                                    .frame(width: 64, height: 64)
                                    .overlay(
                                        Text("U")
                                            .font(.system(size: 28, weight: .bold))
                                            .foregroundColor(.chatrPrimary)
                                    )
                                
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("User Name")
                                        .font(.system(size: 20, weight: .bold))
                                        .foregroundColor(.chatrForeground)
                                    
                                    Text("user@example.com")
                                        .font(.system(size: 14))
                                        .foregroundColor(.chatrMutedForeground)
                                }
                                
                                Spacer()
                                
                                Image(systemName: "chevron.right")
                                    .foregroundColor(.chatrMutedForeground)
                            }
                            .padding(16)
                            .background(Color.chatrCard)
                            .cornerRadius(16)
                        }
                        
                        // Account section
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Account")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(.chatrPrimary)
                                .padding(.horizontal, 4)
                            
                            VStack(spacing: 0) {
                                SettingsRow(
                                    icon: "person.fill",
                                    title: "Profile",
                                    subtitle: "Manage your profile information"
                                )
                                
                                Divider()
                                    .background(Color.chatrBorder)
                                    .padding(.leading, 56)
                                
                                SettingsRow(
                                    icon: "lock.shield.fill",
                                    title: "Privacy & Security",
                                    subtitle: "Control your privacy settings"
                                )
                                
                                Divider()
                                    .background(Color.chatrBorder)
                                    .padding(.leading, 56)
                                
                                SettingsRow(
                                    icon: "lock.fill",
                                    title: "Two-Factor Authentication",
                                    subtitle: "Add an extra layer of security"
                                )
                            }
                        }
                        
                        // Preferences section
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Preferences")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(.chatrPrimary)
                                .padding(.horizontal, 4)
                            
                            VStack(spacing: 0) {
                                SettingsToggleRow(
                                    icon: "bell.fill",
                                    title: "Notifications",
                                    subtitle: "Enable push notifications",
                                    isOn: $notificationsEnabled
                                )
                                
                                Divider()
                                    .background(Color.chatrBorder)
                                    .padding(.leading, 56)
                                
                                SettingsToggleRow(
                                    icon: "moon.fill",
                                    title: "Dark Mode",
                                    subtitle: "Use dark theme",
                                    isOn: $darkModeEnabled
                                )
                                
                                Divider()
                                    .background(Color.chatrBorder)
                                    .padding(.leading, 56)
                                
                                SettingsToggleRow(
                                    icon: "arrow.down.circle.fill",
                                    title: "Auto-Download Media",
                                    subtitle: "Automatically download photos and videos",
                                    isOn: $autoDownloadMedia
                                )
                                
                                Divider()
                                    .background(Color.chatrBorder)
                                    .padding(.leading, 56)
                                
                                SettingsToggleRow(
                                    icon: "location.fill",
                                    title: "Location Sharing",
                                    subtitle: "Share your location with contacts",
                                    isOn: $locationSharingEnabled
                                )
                            }
                        }
                        
                        // More section
                        VStack(alignment: .leading, spacing: 8) {
                            Text("More")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(.chatrPrimary)
                                .padding(.horizontal, 4)
                            
                            VStack(spacing: 0) {
                                SettingsRow(
                                    icon: "internaldrive.fill",
                                    title: "Storage & Data",
                                    subtitle: "Manage storage usage"
                                )
                                
                                Divider()
                                    .background(Color.chatrBorder)
                                    .padding(.leading, 56)
                                
                                SettingsRow(
                                    icon: "globe",
                                    title: "Language",
                                    subtitle: "English (US)"
                                )
                                
                                Divider()
                                    .background(Color.chatrBorder)
                                    .padding(.leading, 56)
                                
                                SettingsRow(
                                    icon: "questionmark.circle.fill",
                                    title: "Help & Support",
                                    subtitle: "Get help and contact support"
                                )
                                
                                Divider()
                                    .background(Color.chatrBorder)
                                    .padding(.leading, 56)
                                
                                SettingsRow(
                                    icon: "info.circle.fill",
                                    title: "About",
                                    subtitle: "Version 1.0.0"
                                )
                            }
                        }
                        
                        // Logout button
                        Button {
                            showLogoutDialog = true
                        } label: {
                            HStack {
                                Image(systemName: "rectangle.portrait.and.arrow.right")
                                    .font(.system(size: 20))
                                Spacer()
                                Text("Logout")
                                    .font(.system(size: 16, weight: .bold))
                                Spacer()
                            }
                            .foregroundColor(.white)
                            .frame(height: 56)
                            .background(Color.chatrDestructive)
                            .cornerRadius(12)
                        }
                        .padding(.top, 8)
                    }
                    .padding()
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.large)
            .alert("Logout", isPresented: $showLogoutDialog) {
                Button("Logout", role: .destructive) {
                    // Handle logout
                }
                Button("Cancel", role: .cancel) { }
            } message: {
                Text("Are you sure you want to logout?")
            }
        }
    }
}

struct SettingsRow: View {
    let icon: String
    let title: String
    let subtitle: String
    
    var body: some View {
        Button {
            // Navigate action
        } label: {
            HStack(spacing: 16) {
                Image(systemName: icon)
                    .font(.system(size: 20))
                    .foregroundColor(.chatrPrimary)
                    .frame(width: 24)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.chatrForeground)
                    
                    Text(subtitle)
                        .font(.system(size: 12))
                        .foregroundColor(.chatrMutedForeground)
                }
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .font(.system(size: 14))
                    .foregroundColor(.chatrMutedForeground)
            }
            .padding(16)
            .background(Color.chatrCard)
        }
    }
}

struct SettingsToggleRow: View {
    let icon: String
    let title: String
    let subtitle: String
    @Binding var isOn: Bool
    
    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundColor(.chatrPrimary)
                .frame(width: 24)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.chatrForeground)
                
                Text(subtitle)
                    .font(.system(size: 12))
                    .foregroundColor(.chatrMutedForeground)
            }
            
            Spacer()
            
            Toggle("", isOn: $isOn)
                .labelsHidden()
                .tint(.chatrPrimary)
        }
        .padding(16)
        .background(Color.chatrCard)
    }
}
