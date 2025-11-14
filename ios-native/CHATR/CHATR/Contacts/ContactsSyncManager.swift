import Foundation
import Contacts
import CryptoKit

class ContactsSyncManager: ObservableObject {
    @Published var syncStatus: SyncStatus = .idle
    @Published var lastSyncDate: Date?
    
    private let contactStore = CNContactStore()
    
    func requestPermission(completion: @escaping (Bool) -> Void) {
        contactStore.requestAccess(for: .contacts) { granted, error in
            DispatchQueue.main.async {
                completion(granted)
            }
        }
    }
    
    func checkPermissionStatus() -> Bool {
        return CNContactStore.authorizationStatus(for: .contacts) == .authorized
    }
    
    func syncContacts() async throws -> Int {
        guard checkPermissionStatus() else {
            throw SyncError.permissionDenied
        }
        
        DispatchQueue.main.async {
            self.syncStatus = .syncing
        }
        
        do {
            let contacts = try fetchContacts()
            let normalized = normalizeContacts(contacts)
            let hashed = hashContacts(normalized)
            
            try await uploadContacts(hashed)
            
            DispatchQueue.main.async {
                self.syncStatus = .success(count: normalized.count)
                self.lastSyncDate = Date()
            }
            
            return normalized.count
        } catch {
            DispatchQueue.main.async {
                self.syncStatus = .error(error.localizedDescription)
            }
            throw error
        }
    }
    
    private func fetchContacts() throws -> [CNContact] {
        let keysToFetch: [CNKeyDescriptor] = [
            CNContactGivenNameKey as CNKeyDescriptor,
            CNContactFamilyNameKey as CNKeyDescriptor,
            CNContactPhoneNumbersKey as CNKeyDescriptor
        ]
        
        let request = CNContactFetchRequest(keysToFetch: keysToFetch)
        var contacts: [CNContact] = []
        
        try contactStore.enumerateContacts(with: request) { contact, _ in
            contacts.append(contact)
        }
        
        return contacts
    }
    
    private func normalizeContacts(_ contacts: [CNContact]) -> [NormalizedContact] {
        var normalized: [NormalizedContact] = []
        var seen = Set<String>()
        
        for contact in contacts {
            let fullName = "\(contact.givenName) \(contact.familyName)".trimmingCharacters(in: .whitespaces)
            
            for phoneNumber in contact.phoneNumbers {
                let normalized = normalizePhoneNumber(phoneNumber.value.stringValue)
                
                // Deduplicate
                if !normalized.isEmpty && !seen.contains(normalized) {
                    seen.insert(normalized)
                    normalized.append(
                        NormalizedContact(
                            name: fullName,
                            phoneNormalized: normalized
                        )
                    )
                }
            }
        }
        
        return normalized
    }
    
    private func normalizePhoneNumber(_ phone: String) -> String {
        // Remove all non-digit characters
        let digits = phone.filter { $0.isNumber }
        
        // Remove leading country code if present
        if digits.hasPrefix("1") && digits.count == 11 {
            return String(digits.dropFirst())
        } else if digits.count >= 10 {
            return String(digits.suffix(10))
        } else {
            return digits
        }
    }
    
    private func hashContacts(_ contacts: [NormalizedContact]) -> [HashedContact] {
        return contacts.map { contact in
            HashedContact(
                nameHash: hashString(contact.name),
                phoneHash: hashString(contact.phoneNormalized)
            )
        }
    }
    
    private func hashString(_ input: String) -> String {
        let data = Data(input.utf8)
        let hashed = SHA256.hash(data: data)
        return hashed.compactMap { String(format: "%02x", $0) }.joined()
    }
    
    private func uploadContacts(_ contacts: [HashedContact]) async throws {
        guard let url = URL(string: "\(APIConfig.baseURL)/contacts/sync") else {
            throw SyncError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = try JSONEncoder().encode(contacts)
        request.httpBody = body
        
        let (_, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw SyncError.uploadFailed
        }
    }
    
    func scheduleBackgroundSync() {
        // Register background task
        // Implementation would use BGTaskScheduler
    }
}

struct NormalizedContact {
    let name: String
    let phoneNormalized: String
}

struct HashedContact: Codable {
    let nameHash: String
    let phoneHash: String
}

enum SyncStatus {
    case idle
    case syncing
    case success(count: Int)
    case error(String)
}

enum SyncError: Error {
    case permissionDenied
    case invalidURL
    case uploadFailed
}
