import Foundation
import UserNotifications
import UIKit

class APNSService: NSObject, ObservableObject {
    static let shared = APNSService()
    
    @Published var notificationPermission: UNAuthorizationStatus = .notDetermined
    
    private override init() {
        super.init()
    }
    
    func requestPermission(completion: @escaping (Bool) -> Void) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            DispatchQueue.main.async {
                if granted {
                    UIApplication.shared.registerForRemoteNotifications()
                }
                completion(granted)
            }
        }
    }
    
    func checkPermissionStatus() {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            DispatchQueue.main.async {
                self.notificationPermission = settings.authorizationStatus
            }
        }
    }
    
    func registerDeviceToken(_ deviceToken: Data) {
        let tokenParts = deviceToken.map { data in String(format: "%02.2hhx", data) }
        let token = tokenParts.joined()
        
        // Send token to backend
        sendTokenToServer(token)
    }
    
    private func sendTokenToServer(_ token: String) {
        guard let url = URL(string: "\(APIConfig.baseURL)/notifications/register") else { return }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = [
            "deviceToken": token,
            "platform": "ios",
            "userId": UserDefaults.standard.string(forKey: "userId") ?? ""
        ]
        
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("Failed to register device token: \(error)")
            }
        }.resume()
    }
    
    func handleNotification(_ userInfo: [AnyHashable: Any], completion: @escaping () -> Void) {
        guard let type = userInfo["type"] as? String else {
            completion()
            return
        }
        
        switch type {
        case "message":
            handleMessageNotification(userInfo)
        case "call":
            handleCallNotification(userInfo)
        default:
            break
        }
        
        completion()
    }
    
    private func handleMessageNotification(_ userInfo: [AnyHashable: Any]) {
        guard let conversationId = userInfo["conversationId"] as? String else { return }
        
        // Navigate to conversation or update UI
        NotificationCenter.default.post(
            name: NSNotification.Name("OpenConversation"),
            object: nil,
            userInfo: ["conversationId": conversationId]
        )
    }
    
    private func handleCallNotification(_ userInfo: [AnyHashable: Any]) {
        // Handled by CallKit/PushKit
    }
    
    func setBadgeCount(_ count: Int) {
        DispatchQueue.main.async {
            UIApplication.shared.applicationIconBadgeNumber = count
        }
    }
}

// MARK: - UNUserNotificationCenterDelegate
extension APNSService: UNUserNotificationCenterDelegate {
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        // Show notification even when app is in foreground
        completionHandler([.banner, .sound, .badge])
    }
    
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo
        
        switch response.actionIdentifier {
        case "REPLY_ACTION":
            handleReplyAction(response)
        case "MARK_READ_ACTION":
            handleMarkReadAction(userInfo)
        default:
            handleNotification(userInfo, completion: completionHandler)
        }
        
        completionHandler()
    }
    
    private func handleReplyAction(_ response: UNNotificationResponse) {
        guard let textResponse = response as? UNTextInputNotificationResponse else { return }
        let replyText = textResponse.userText
        let userInfo = response.notification.request.content.userInfo
        
        // Send reply through API
        if let conversationId = userInfo["conversationId"] as? String {
            sendQuickReply(conversationId: conversationId, message: replyText)
        }
    }
    
    private func handleMarkReadAction(_ userInfo: [AnyHashable: Any]) {
        guard let messageId = userInfo["messageId"] as? String else { return }
        markMessageAsRead(messageId)
    }
    
    private func sendQuickReply(conversationId: String, message: String) {
        guard let url = URL(string: "\(APIConfig.baseURL)/messages") else { return }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = [
            "conversationId": conversationId,
            "message": message,
            "type": "text"
        ]
        
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        URLSession.shared.dataTask(with: request).resume()
    }
    
    private func markMessageAsRead(_ messageId: String) {
        guard let url = URL(string: "\(APIConfig.baseURL)/messages/\(messageId)/read") else { return }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        
        URLSession.shared.dataTask(with: request).resume()
    }
}

struct APIConfig {
    static let baseURL = "https://your-backend.com/api"
}
