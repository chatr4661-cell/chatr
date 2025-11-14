import Foundation
import WebRTC
import AVFoundation

class MediaManager: ObservableObject {
    private var videoCapturer: RTCCameraVideoCapturer?
    private var videoSource: RTCVideoSource?
    private var audioSource: RTCAudioSource?
    private var localVideoTrack: RTCVideoTrack?
    private var localAudioTrack: RTCAudioTrack?
    private var localMediaStream: RTCMediaStream?
    private var peerConnectionFactory: RTCPeerConnectionFactory?
    
    @Published var isMicMuted = false
    @Published var isVideoEnabled = true
    @Published var currentCamera: CameraFacing = .front
    @Published var audioRoute: AudioRoute = .earpiece
    
    private let audioSession = AVAudioSession.sharedInstance()
    
    func initializeFactory(_ factory: RTCPeerConnectionFactory) {
        self.peerConnectionFactory = factory
    }
    
    func createLocalMediaStream(isVideoCall: Bool) -> RTCMediaStream? {
        guard let factory = peerConnectionFactory else { return nil }
        
        // Configure audio session
        do {
            try audioSession.setCategory(.playAndRecord, mode: .voiceChat, options: [.allowBluetooth, .allowBluetoothA2DP])
            try audioSession.setActive(true)
        } catch {
            print("Failed to configure audio session: \(error)")
        }
        
        // Create audio track
        let audioConstraints = RTCMediaConstraints(mandatoryConstraints: nil, optionalConstraints: nil)
        audioSource = factory.audioSource(with: audioConstraints)
        localAudioTrack = factory.audioTrack(with: audioSource!, trackId: "audio_track")
        
        localMediaStream = factory.mediaStream(withStreamId: "local_stream")
        localMediaStream?.addAudioTrack(localAudioTrack!)
        
        // Create video track if video call
        if isVideoCall {
            videoSource = factory.videoSource()
            localVideoTrack = factory.videoTrack(with: videoSource!, trackId: "video_track")
            localMediaStream?.addVideoTrack(localVideoTrack!)
            
            // Setup camera capturer
            videoCapturer = RTCCameraVideoCapturer(delegate: videoSource!)
            startCapture()
        }
        
        return localMediaStream
    }
    
    private func startCapture() {
        guard let capturer = videoCapturer else { return }
        
        let devices = RTCCameraVideoCapturer.captureDevices()
        guard let device = devices.first(where: { $0.position == .front }) else { return }
        
        let formats = RTCCameraVideoCapturer.supportedFormats(for: device)
        guard let format = formats.first(where: { format in
            let dimensions = CMVideoFormatDescriptionGetDimensions(format.formatDescription)
            return dimensions.width == 1280 && dimensions.height == 720
        }) ?? formats.last else { return }
        
        let fps = format.videoSupportedFrameRateRanges.first?.maxFrameRate ?? 30
        
        capturer.startCapture(with: device, format: format, fps: Int(fps))
        currentCamera = .front
    }
    
    func toggleMicrophone() -> Bool {
        localAudioTrack?.isEnabled = isMicMuted
        isMicMuted.toggle()
        return isMicMuted
    }
    
    func toggleVideo() -> Bool {
        localVideoTrack?.isEnabled = isVideoEnabled
        isVideoEnabled.toggle()
        return isVideoEnabled
    }
    
    func switchCamera() {
        guard let capturer = videoCapturer else { return }
        
        let devices = RTCCameraVideoCapturer.captureDevices()
        let targetPosition: AVCaptureDevice.Position = currentCamera == .front ? .back : .front
        
        guard let device = devices.first(where: { $0.position == targetPosition }) else { return }
        
        let formats = RTCCameraVideoCapturer.supportedFormats(for: device)
        guard let format = formats.first(where: { format in
            let dimensions = CMVideoFormatDescriptionGetDimensions(format.formatDescription)
            return dimensions.width == 1280 && dimensions.height == 720
        }) ?? formats.last else { return }
        
        let fps = format.videoSupportedFrameRateRanges.first?.maxFrameRate ?? 30
        
        capturer.startCapture(with: device, format: format, fps: Int(fps))
        currentCamera = currentCamera == .front ? .back : .front
    }
    
    func setAudioRoute(_ route: AudioRoute) {
        audioRoute = route
        
        do {
            switch route {
            case .speaker:
                try audioSession.overrideOutputAudioPort(.speaker)
            case .earpiece:
                try audioSession.overrideOutputAudioPort(.none)
            case .bluetooth:
                try audioSession.setCategory(.playAndRecord, mode: .voiceChat, options: [.allowBluetooth])
            case .wiredHeadset:
                try audioSession.overrideOutputAudioPort(.none)
            }
        } catch {
            print("Failed to set audio route: \(error)")
        }
    }
    
    func release() {
        videoCapturer?.stopCapture()
        
        localVideoTrack = nil
        localAudioTrack = nil
        videoSource = nil
        audioSource = nil
        localMediaStream = nil
        
        // Reset audio session
        do {
            try audioSession.setActive(false)
        } catch {
            print("Failed to deactivate audio session: \(error)")
        }
    }
}

enum CameraFacing {
    case front
    case back
}

enum AudioRoute {
    case speaker
    case earpiece
    case bluetooth
    case wiredHeadset
}
