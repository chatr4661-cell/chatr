import Foundation
import WebRTC

class PeerConnectionManager: NSObject {
    private var peerConnection: RTCPeerConnection?
    private var peerConnectionFactory: RTCPeerConnectionFactory?
    
    @Published var connectionState: RTCPeerConnectionState = .new
    @Published var networkQuality: NetworkQuality = .excellent
    
    private var onIceCandidate: ((RTCIceCandidate) -> Void)?
    private var onAddStream: ((RTCMediaStream) -> Void)?
    private var onRemoveStream: ((RTCMediaStream) -> Void)?
    
    override init() {
        super.init()
        initializePeerConnectionFactory()
    }
    
    private func initializePeerConnectionFactory() {
        let videoEncoderFactory = RTCDefaultVideoEncoderFactory()
        let videoDecoderFactory = RTCDefaultVideoDecoderFactory()
        
        peerConnectionFactory = RTCPeerConnectionFactory(
            encoderFactory: videoEncoderFactory,
            decoderFactory: videoDecoderFactory
        )
    }
    
    func createPeerConnection(
        stunServers: [String],
        turnConfig: TurnConfig?,
        onIceCandidate: @escaping (RTCIceCandidate) -> Void,
        onAddStream: @escaping (RTCMediaStream) -> Void,
        onRemoveStream: @escaping (RTCMediaStream) -> Void
    ) -> Bool {
        self.onIceCandidate = onIceCandidate
        self.onAddStream = onAddStream
        self.onRemoveStream = onRemoveStream
        
        var iceServers = [RTCIceServer]()
        
        // Add STUN servers
        for stun in stunServers {
            iceServers.append(RTCIceServer(urlStrings: [stun]))
        }
        
        // Add TURN server
        if let turn = turnConfig {
            iceServers.append(RTCIceServer(
                urlStrings: [turn.url],
                username: turn.username,
                credential: turn.password
            ))
        }
        
        let config = RTCConfiguration()
        config.iceServers = iceServers
        config.tcpCandidatePolicy = .enabled
        config.bundlePolicy = .maxBundle
        config.rtcpMuxPolicy = .require
        config.continualGatheringPolicy = .gatherContinually
        config.keyType = .ECDSA
        config.sdpSemantics = .unifiedPlan
        
        let constraints = RTCMediaConstraints(
            mandatoryConstraints: nil,
            optionalConstraints: ["DtlsSrtpKeyAgreement": "true"]
        )
        
        guard let factory = peerConnectionFactory else { return false }
        
        peerConnection = factory.peerConnection(
            with: config,
            constraints: constraints,
            delegate: self
        )
        
        return peerConnection != nil
    }
    
    func createOffer(
        videoEnabled: Bool,
        completion: @escaping (Result<RTCSessionDescription, Error>) -> Void
    ) {
        let constraints = RTCMediaConstraints(
            mandatoryConstraints: [
                "OfferToReceiveAudio": "true",
                "OfferToReceiveVideo": videoEnabled ? "true" : "false"
            ],
            optionalConstraints: nil
        )
        
        peerConnection?.offer(for: constraints) { [weak self] sdp, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let sdp = sdp else {
                completion(.failure(NSError(domain: "PeerConnection", code: -1)))
                return
            }
            
            self?.peerConnection?.setLocalDescription(sdp) { error in
                if let error = error {
                    completion(.failure(error))
                } else {
                    completion(.success(sdp))
                }
            }
        }
    }
    
    func createAnswer(
        completion: @escaping (Result<RTCSessionDescription, Error>) -> Void
    ) {
        let constraints = RTCMediaConstraints(
            mandatoryConstraints: [
                "OfferToReceiveAudio": "true",
                "OfferToReceiveVideo": "true"
            ],
            optionalConstraints: nil
        )
        
        peerConnection?.answer(for: constraints) { [weak self] sdp, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let sdp = sdp else {
                completion(.failure(NSError(domain: "PeerConnection", code: -1)))
                return
            }
            
            self?.peerConnection?.setLocalDescription(sdp) { error in
                if let error = error {
                    completion(.failure(error))
                } else {
                    completion(.success(sdp))
                }
            }
        }
    }
    
    func setRemoteDescription(
        _ sdp: RTCSessionDescription,
        completion: @escaping (Error?) -> Void
    ) {
        peerConnection?.setRemoteDescription(sdp, completionHandler: completion)
    }
    
    func addIceCandidate(_ candidate: RTCIceCandidate) {
        peerConnection?.add(candidate)
    }
    
    func addLocalStream(_ stream: RTCMediaStream) {
        peerConnection?.add(stream)
    }
    
    func close() {
        peerConnection?.close()
        peerConnection = nil
    }
    
    func dispose() {
        close()
        peerConnectionFactory = nil
    }
}

// MARK: - RTCPeerConnectionDelegate
extension PeerConnectionManager: RTCPeerConnectionDelegate {
    func peerConnection(_ peerConnection: RTCPeerConnection, didChange stateChanged: RTCSignalingState) {}
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didAdd stream: RTCMediaStream) {
        DispatchQueue.main.async { [weak self] in
            self?.onAddStream?(stream)
        }
    }
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didRemove stream: RTCMediaStream) {
        DispatchQueue.main.async { [weak self] in
            self?.onRemoveStream?(stream)
        }
    }
    
    func peerConnectionShouldNegotiate(_ peerConnection: RTCPeerConnection) {}
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didChange newState: RTCIceConnectionState) {}
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didChange newState: RTCIceGatheringState) {}
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didGenerate candidate: RTCIceCandidate) {
        DispatchQueue.main.async { [weak self] in
            self?.onIceCandidate?(candidate)
        }
    }
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didRemove candidates: [RTCIceCandidate]) {}
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didOpen dataChannel: RTCDataChannel) {}
}

struct TurnConfig {
    let url: String
    let username: String
    let password: String
}

enum NetworkQuality {
    case excellent
    case good
    case fair
    case poor
    case disconnected
}
