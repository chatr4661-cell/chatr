import Foundation
import PushKit
import CallKit

class PushKitHandler: NSObject, PKPushRegistryDelegate {
    static let shared = PushKitHandler()
    
    private let pushRegistry: PKPushRegistry
    private let callManager = ChatrCallManager.shared
    
    private override init() {
        pushRegistry = PKPushRegistry(queue: .main)
        super.init()
        pushRegistry.delegate = self
        pushRegistry.desiredPushTypes = [.voIP]
    }
    
    // MARK: - PKPushRegistryDelegate
    
    func pushRegistry(_ registry: PKPushRegistry, didUpdate pushCredentials: PKPushCredentials, for type: PKPushType) {
        guard type == .voIP else { return }
        
        let token = pushCredentials.token.map { String(format: "%02x", $0) }.joined()
        print("VoIP Token: \(token)")
        
        // Send token to backend
        sendVoIPTokenToServer(token)
    }
    
    func pushRegistry(_ registry: PKPushRegistry, didReceiveIncomingPushWith payload: PKPushPayload, for type: PKPushType) {
        guard type == .voIP else { return }
        
        // Extract call info from payload
        guard let callId = payload.dictionaryPayload["callId"] as? String,
              let fromId = payload.dictionaryPayload["fromId"] as? String,
              let fromName = payload.dictionaryPayload["fromName"] as? String,
              let isVideoString = payload.dictionaryPayload["isVideo"] as? String,
              let isVideo = Bool(isVideoString) else {
            return
        }
        
        // Report incoming call to CallKit
        callManager.reportIncomingCall(
            callId: callId,
            fromId: fromId,
            fromName: fromName,
            isVideo: isVideo
        )
    }
    
    func pushRegistry(_ registry: PKPushRegistry, didInvalidatePushTokenFor type: PKPushType) {
        print("VoIP token invalidated")
        // Optionally notify backend that token is no longer valid
    }
    
    // MARK: - Helper Methods
    
    private func sendVoIPTokenToServer(_ token: String) {
        guard let url = URL(string: "\(APIConfig.baseURL)/notifications/register-voip") else { return }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = [
            "voipToken": token,
            "platform": "ios",
            "userId": UserDefaults.standard.string(forKey: "userId") ?? ""
        ]
        
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("Failed to register VoIP token: \(error)")
            } else {
                print("VoIP token registered successfully")
            }
        }.resume()
    }
}
