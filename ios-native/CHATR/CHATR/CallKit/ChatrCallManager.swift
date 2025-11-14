import Foundation
import CallKit
import AVFoundation
import WebRTC
import Combine

class ChatrCallManager: NSObject, ObservableObject {
    static let shared = ChatrCallManager()
    
    private let callController = CXCallController()
    private var provider: CXProvider?
    
    @Published var activeCall: ActiveCall?
    @Published var callState: CallState = .idle
    
    private var mediaManager: MediaManager?
    private var peerConnectionManager: PeerConnectionManager?
    private var signalingClient: CallSignaling?
    
    private var cancellables = Set<AnyCancellable>()
    
    override init() {
        super.init()
        setupCallKit()
    }
    
    private func setupCallKit() {
        let config = CXProviderConfiguration(localizedName: "CHATR")
        config.supportsVideo = true
        config.maximumCallsPerCallGroup = 1
        config.supportedHandleTypes = [.generic]
        
        if let iconImage = UIImage(named: "AppIcon") {
            config.iconTemplateImageData = iconImage.pngData()
        }
        
        provider = CXProvider(configuration: config)
        provider?.setDelegate(self, queue: nil)
    }
    
    func initiateCall(
        callId: String,
        recipientId: String,
        recipientName: String,
        isVideo: Bool
    ) {
        let handle = CXHandle(type: .generic, value: recipientId)
        let startCallAction = CXStartCallAction(call: UUID(uuidString: callId) ?? UUID(), handle: handle)
        startCallAction.isVideo = isVideo
        
        let transaction = CXTransaction(action: startCallAction)
        
        callController.request(transaction) { [weak self] error in
            if let error = error {
                print("Failed to start call: \(error)")
                return
            }
            
            self?.activeCall = ActiveCall(
                callId: callId,
                partnerId: recipientId,
                partnerName: recipientName,
                isVideo: isVideo,
                isOutgoing: true
            )
            self?.callState = .initiating
            
            // Initialize WebRTC and signaling
            self?.setupCallInfrastructure(isVideo: isVideo)
        }
    }
    
    func reportIncomingCall(
        callId: String,
        fromId: String,
        fromName: String,
        isVideo: Bool
    ) {
        let update = CXCallUpdate()
        update.remoteHandle = CXHandle(type: .generic, value: fromId)
        update.hasVideo = isVideo
        update.localizedCallerName = fromName
        
        let callUUID = UUID(uuidString: callId) ?? UUID()
        
        provider?.reportNewIncomingCall(with: callUUID, update: update) { [weak self] error in
            if let error = error {
                print("Failed to report incoming call: \(error)")
                return
            }
            
            self?.activeCall = ActiveCall(
                callId: callId,
                partnerId: fromId,
                partnerName: fromName,
                isVideo: isVideo,
                isOutgoing: false
            )
            self?.callState = .incoming
        }
    }
    
    func endCall() {
        guard let call = activeCall else { return }
        
        let endCallAction = CXEndCallAction(call: UUID(uuidString: call.callId) ?? UUID())
        let transaction = CXTransaction(action: endCallAction)
        
        callController.request(transaction) { [weak self] error in
            if let error = error {
                print("Failed to end call: \(error)")
            }
            self?.cleanup()
        }
    }
    
    private func setupCallInfrastructure(isVideo: Bool) {
        // Initialize signaling
        signalingClient = CallSignaling(signalingUrl: "wss://your-backend.com/signaling")
        signalingClient?.connect(userId: "current-user-id") // Replace with actual user ID
        
        // Initialize media
        mediaManager = MediaManager()
        
        // Initialize peer connection
        peerConnectionManager = PeerConnectionManager()
        
        // Setup signaling listeners
        signalingClient?.callAnswerSubject
            .sink { [weak self] answer in
                self?.handleCallAnswer(answer)
            }
            .store(in: &cancellables)
        
        signalingClient?.iceCandidateSubject
            .sink { [weak self] candidate in
                self?.handleIceCandidate(candidate)
            }
            .store(in: &cancellables)
    }
    
    private func handleCallAnswer(_ answer: CallAnswer) {
        let sdp = RTCSessionDescription(
            type: RTCSdpType(rawValue: answer.type) ?? .answer,
            sdp: answer.sdp
        )
        
        peerConnectionManager?.setRemoteDescription(sdp) { [weak self] error in
            if error == nil {
                self?.callState = .connected
            }
        }
    }
    
    private func handleIceCandidate(_ candidateEvent: IceCandidateEvent) {
        let candidate = RTCIceCandidate(
            sdp: candidateEvent.candidate,
            sdpMLineIndex: Int32(candidateEvent.sdpMLineIndex),
            sdpMid: candidateEvent.sdpMid
        )
        peerConnectionManager?.addIceCandidate(candidate)
    }
    
    func toggleMicrophone() -> Bool {
        return mediaManager?.toggleMicrophone() ?? false
    }
    
    func toggleVideo() -> Bool {
        return mediaManager?.toggleVideo() ?? false
    }
    
    func switchCamera() {
        mediaManager?.switchCamera()
    }
    
    func setAudioRoute(_ route: AudioRoute) {
        mediaManager?.setAudioRoute(route)
    }
    
    private func cleanup() {
        callState = .idle
        activeCall = nil
        
        peerConnectionManager?.close()
        peerConnectionManager = nil
        
        mediaManager?.release()
        mediaManager = nil
        
        signalingClient?.disconnect()
        signalingClient = nil
        
        cancellables.removeAll()
    }
}

// MARK: - CXProviderDelegate
extension ChatrCallManager: CXProviderDelegate {
    func providerDidReset(_ provider: CXProvider) {
        cleanup()
    }
    
    func provider(_ provider: CXProvider, perform action: CXStartCallAction) {
        action.fulfill()
    }
    
    func provider(_ provider: CXProvider, perform action: CXAnswerCallAction) {
        callState = .connecting
        setupCallInfrastructure(isVideo: activeCall?.isVideo ?? false)
        action.fulfill()
    }
    
    func provider(_ provider: CXProvider, perform action: CXEndCallAction) {
        cleanup()
        action.fulfill()
    }
    
    func provider(_ provider: CXProvider, perform action: CXSetMutedCallAction) {
        _ = mediaManager?.toggleMicrophone()
        action.fulfill()
    }
    
    func provider(_ provider: CXProvider, didActivate audioSession: AVAudioSession) {
        // Audio session activated
    }
    
    func provider(_ provider: CXProvider, didDeactivate audioSession: AVAudioSession) {
        // Audio session deactivated
    }
}

struct ActiveCall {
    let callId: String
    let partnerId: String
    let partnerName: String
    let isVideo: Bool
    let isOutgoing: Bool
}

enum CallState {
    case idle
    case initiating
    case ringing
    case incoming
    case connecting
    case connected
    case failed
    case ended
}
