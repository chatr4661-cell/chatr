import SwiftUI

struct Contact: Identifiable {
    let id: String
    let name: String
    let phoneNumber: String
    let isOnChatr: Bool
    let isOnline: Bool
    let status: String?
    
    var avatarInitial: String {
        String(name.prefix(1))
    }
}

struct ContactsView: View {
    @State private var searchQuery = ""
    @State private var showSyncDialog = false
    @State private var contacts: [Contact] = [
        Contact(id: "1", name: "Alice Johnson", phoneNumber: "+1 234 567 8901", isOnChatr: true, isOnline: true, status: "Available"),
        Contact(id: "2", name: "Bob Smith", phoneNumber: "+1 234 567 8902", isOnChatr: true, isOnline: false, status: nil),
        Contact(id: "3", name: "Charlie Brown", phoneNumber: "+1 234 567 8903", isOnChatr: true, isOnline: true, status: "In a meeting"),
        Contact(id: "4", name: "Diana Prince", phoneNumber: "+1 234 567 8904", isOnChatr: false, isOnline: false, status: nil),
        Contact(id: "5", name: "Ethan Hunt", phoneNumber: "+1 234 567 8905", isOnChatr: true, isOnline: true, status: nil),
        Contact(id: "6", name: "Fiona Gallagher", phoneNumber: "+1 234 567 8906", isOnChatr: true, isOnline: false, status: nil),
        Contact(id: "7", name: "George Wilson", phoneNumber: "+1 234 567 8907", isOnChatr: false, isOnline: false, status: nil),
        Contact(id: "8", name: "Hannah Montana", phoneNumber: "+1 234 567 8908", isOnChatr: true, isOnline: true, status: "Busy")
    ]
    
    var filteredContacts: [Contact] {
        if searchQuery.isEmpty {
            return contacts
        }
        return contacts.filter { $0.name.localizedCaseInsensitiveContains(searchQuery) }
    }
    
    var groupedContacts: [(String, [Contact])] {
        Dictionary(grouping: filteredContacts) { String($0.name.prefix(1)).uppercased() }
            .sorted { $0.key < $1.key }
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.chatrBackground.ignoresSafeArea()
                
                VStack(spacing: 0) {
                    // Search bar
                    ChatrSearchBar(
                        text: $searchQuery,
                        placeholder: "Search contacts..."
                    )
                    .padding()
                    
                    // Contacts count
                    HStack {
                        Text("\(contacts.filter { $0.isOnChatr }.count) on CHATR • \(contacts.count) total")
                            .font(.system(size: 12))
                            .foregroundColor(.chatrMutedForeground)
                        Spacer()
                    }
                    .padding(.horizontal)
                    .padding(.bottom, 8)
                    
                    // Contacts list
                    ScrollView {
                        LazyVStack(spacing: 0, pinnedViews: [.sectionHeaders]) {
                            ForEach(groupedContacts, id: \.0) { letter, contactsInGroup in
                                Section {
                                    ForEach(contactsInGroup) { contact in
                                        ContactRow(contact: contact)
                                            .padding(.horizontal)
                                    }
                                } header: {
                                    HStack {
                                        Text(letter)
                                            .font(.system(size: 16, weight: .bold))
                                            .foregroundColor(.chatrPrimary)
                                        Spacer()
                                    }
                                    .padding(.horizontal)
                                    .padding(.vertical, 8)
                                    .background(Color.chatrBackground)
                                }
                            }
                        }
                        .padding(.vertical, 8)
                    }
                }
            }
            .navigationTitle("Contacts")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        showSyncDialog = true
                    } label: {
                        Image(systemName: "arrow.triangle.2.circlepath")
                            .foregroundColor(.chatrPrimary)
                    }
                }
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
                    // Add contact action
                } label: {
                    Image(systemName: "person.badge.plus")
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
            .alert("Sync Contacts", isPresented: $showSyncDialog) {
                Button("Allow", role: .none) {
                    // Handle sync
                }
                Button("Cancel", role: .cancel) { }
            } message: {
                Text("Allow CHATR to access your contacts to find friends using the app?")
            }
        }
    }
}

struct ContactRow: View {
    let contact: Contact
    
    var body: some View {
        Button {
            // Navigate to contact detail
        } label: {
            HStack(spacing: 12) {
                // Avatar
                ZStack(alignment: .bottomTrailing) {
                    Circle()
                        .fill(contact.isOnChatr ? Color.chatrPrimary.opacity(0.3) : Color.chatrMuted)
                        .frame(width: 56, height: 56)
                        .overlay(
                            Text(contact.avatarInitial)
                                .font(.system(size: 24, weight: .bold))
                                .foregroundColor(contact.isOnChatr ? .chatrPrimary : .chatrMutedForeground)
                        )
                    
                    if contact.isOnline && contact.isOnChatr {
                        Circle()
                            .fill(Color.chatrSuccess)
                            .frame(width: 16, height: 16)
                            .overlay(
                                Circle()
                                    .stroke(Color.chatrCard, lineWidth: 2)
                            )
                    }
                }
                
                // Contact info
                VStack(alignment: .leading, spacing: 4) {
                    Text(contact.name)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.chatrForeground)
                    
                    if contact.isOnChatr, let status = contact.status {
                        Text(status)
                            .font(.system(size: 12))
                            .foregroundColor(.chatrMutedForeground)
                    } else if contact.isOnChatr {
                        Text("On CHATR")
                            .font(.system(size: 12))
                            .foregroundColor(.chatrPrimary)
                    } else {
                        Text(contact.phoneNumber)
                            .font(.system(size: 12))
                            .foregroundColor(.chatrMutedForeground)
                    }
                }
                
                Spacer()
                
                // Action buttons
                if contact.isOnChatr {
                    HStack(spacing: 4) {
                        Button {
                            // Message action
                        } label: {
                            Image(systemName: "message.fill")
                                .font(.system(size: 18))
                                .foregroundColor(.chatrPrimary)
                                .frame(width: 40, height: 40)
                        }
                        
                        Button {
                            // Call action
                        } label: {
                            Image(systemName: "phone.fill")
                                .font(.system(size: 18))
                                .foregroundColor(.chatrPrimary)
                                .frame(width: 40, height: 40)
                        }
                    }
                } else {
                    Button {
                        // Invite action
                    } label: {
                        Text("Invite")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.chatrPrimary)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(Color.chatrPrimary.opacity(0.1))
                            .cornerRadius(8)
                    }
                }
            }
            .padding(12)
            .background(Color.chatrCard)
            .cornerRadius(12)
        }
        .padding(.vertical, 4)
    }
}
