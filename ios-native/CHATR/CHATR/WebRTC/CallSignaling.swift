import Foundation
import SocketIO
import WebRTC
import Combine

class CallSignaling: ObservableObject {
    private var manager: SocketManager?
    private var socket: SocketIOClient?
    
    let callOfferSubject = PassthroughSubject<CallOffer, Never>()
    let callAnswerSubject = PassthroughSubject<CallAnswer, Never>()
    let iceCandidateSubject = PassthroughSubject<IceCandidateEvent, Never>()
    let callEndSubject = PassthroughSubject<String, Never>()
    
    init(signalingUrl: String) {
        guard let url = URL(string: signalingUrl) else { return }
        manager = SocketManager(socketURL: url, config: [.log(false), .compress])
        socket = manager?.defaultSocket
    }
    
    func connect(userId: String) {
        socket?.on(clientEvent: .connect) { _, _ in
            print("Socket connected")
        }
        
        socket?.on("call-offer") { [weak self] data, _ in
            guard let dict = data.first as? [String: Any],
                  let callId = dict["callId"] as? String,
                  let from = dict["from"] as? String,
                  let sdp = dict["sdp"] as? String,
                  let type = dict["type"] as? String,
                  let isVideo = dict["isVideo"] as? Bool else { return }
            
            let offer = CallOffer(
                callId: callId,
                from: from,
                sdp: sdp,
                type: type,
                isVideo: isVideo
            )
            self?.callOfferSubject.send(offer)
        }
        
        socket?.on("call-answer") { [weak self] data, _ in
            guard let dict = data.first as? [String: Any],
                  let callId = dict["callId"] as? String,
                  let from = dict["from"] as? String,
                  let sdp = dict["sdp"] as? String,
                  let type = dict["type"] as? String else { return }
            
            let answer = CallAnswer(
                callId: callId,
                from: from,
                sdp: sdp,
                type: type
            )
            self?.callAnswerSubject.send(answer)
        }
        
        socket?.on("call-candidate") { [weak self] data, _ in
            guard let dict = data.first as? [String: Any],
                  let callId = dict["callId"] as? String,
                  let from = dict["from"] as? String,
                  let candidate = dict["candidate"] as? String,
                  let sdpMid = dict["sdpMid"] as? String,
                  let sdpMLineIndex = dict["sdpMLineIndex"] as? Int else { return }
            
            let candidateEvent = IceCandidateEvent(
                callId: callId,
                from: from,
                candidate: candidate,
                sdpMid: sdpMid,
                sdpMLineIndex: sdpMLineIndex
            )
            self?.iceCandidateSubject.send(candidateEvent)
        }
        
        socket?.on("call-end") { [weak self] data, _ in
            guard let dict = data.first as? [String: Any],
                  let callId = dict["callId"] as? String else { return }
            
            self?.callEndSubject.send(callId)
        }
        
        socket?.connect()
    }
    
    func sendCallOffer(callId: String, to: String, sdp: RTCSessionDescription, isVideo: Bool) {
        let data: [String: Any] = [
            "callId": callId,
            "to": to,
            "sdp": sdp.sdp,
            "type": RTCSessionDescription.string(for: sdp.type),
            "isVideo": isVideo
        ]
        socket?.emit("call-offer", data)
    }
    
    func sendCallAnswer(callId: String, to: String, sdp: RTCSessionDescription) {
        let data: [String: Any] = [
            "callId": callId,
            "to": to,
            "sdp": sdp.sdp,
            "type": RTCSessionDescription.string(for: sdp.type)
        ]
        socket?.emit("call-answer", data)
    }
    
    func sendIceCandidate(callId: String, to: String, candidate: RTCIceCandidate) {
        let data: [String: Any] = [
            "callId": callId,
            "to": to,
            "candidate": candidate.sdp,
            "sdpMid": candidate.sdpMid ?? "",
            "sdpMLineIndex": candidate.sdpMLineIndex
        ]
        socket?.emit("call-candidate", data)
    }
    
    func sendCallEnd(callId: String, to: String) {
        let data: [String: Any] = [
            "callId": callId,
            "to": to
        ]
        socket?.emit("call-end", data)
    }
    
    func disconnect() {
        socket?.disconnect()
    }
}

struct CallOffer {
    let callId: String
    let from: String
    let sdp: String
    let type: String
    let isVideo: Bool
}

struct CallAnswer {
    let callId: String
    let from: String
    let sdp: String
    let type: String
}

struct IceCandidateEvent {
    let callId: String
    let from: String
    let candidate: String
    let sdpMid: String
    let sdpMLineIndex: Int
}
