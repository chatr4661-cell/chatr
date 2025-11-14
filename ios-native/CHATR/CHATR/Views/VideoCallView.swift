import SwiftUI
import WebRTC

struct VideoCallView: View {
    let callerName: String
    let localVideoTrack: RTCVideoTrack?
    let remoteVideoTrack: RTCVideoTrack?
    let isMuted: Bool
    let isVideoEnabled: Bool
    let audioRoute: AudioRoute
    let onToggleMute: () -> Void
    let onToggleVideo: () -> Void
    let onSwitchCamera: () -> Void
    let onToggleAudioRoute: () -> Void
    let onEndCall: () -> Void
    
    @State private var duration: Int = 0
    @State private var showControls = true
    
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            // Remote video (full screen)
            if let remoteTrack = remoteVideoTrack {
                RTCVideoView(videoTrack: remoteTrack)
                    .ignoresSafeArea()
            } else {
                ZStack {
                    ChatrColors.darker.ignoresSafeArea()
                    Text("Connecting...")
                        .foregroundColor(.white)
                        .font(.system(size: 18))
                }
            }
            
            // Local video (PIP - top right)
            if isVideoEnabled, let localTrack = localVideoTrack {
                VStack {
                    HStack {
                        Spacer()
                        RTCVideoView(videoTrack: localTrack)
                            .frame(width: 120, height: 160)
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(ChatrColors.primary, lineWidth: 2)
                            )
                            .padding(16)
                    }
                    Spacer()
                }
            }
            
            // Top bar
            VStack {
                HStack {
                    Spacer()
                    VStack(spacing: 4) {
                        Text(callerName)
                            .foregroundColor(.white)
                            .font(.system(size: 18))
                        Text(formatDuration(duration))
                            .foregroundColor(.white.opacity(0.7))
                            .font(.system(size: 14))
                    }
                    Spacer()
                }
                .padding()
                .background(Color.black.opacity(0.3))
                
                Spacer()
            }
            
            // Bottom controls
            if showControls {
                VStack {
                    Spacer()
                    
                    VStack(spacing: 24) {
                        HStack(spacing: 20) {
                            // Mute button
                            Button(action: onToggleMute) {
                                Circle()
                                    .fill(isMuted ? Color.red : ChatrColors.secondary)
                                    .frame(width: 56, height: 56)
                                    .overlay(
                                        Image(systemName: isMuted ? "mic.slash.fill" : "mic.fill")
                                            .foregroundColor(.white)
                                    )
                            }
                            
                            // Video toggle
                            Button(action: onToggleVideo) {
                                Circle()
                                    .fill(!isVideoEnabled ? Color.red : ChatrColors.secondary)
                                    .frame(width: 56, height: 56)
                                    .overlay(
                                        Image(systemName: isVideoEnabled ? "video.fill" : "video.slash.fill")
                                            .foregroundColor(.white)
                                    )
                            }
                            
                            // Switch camera
                            Button(action: onSwitchCamera) {
                                Circle()
                                    .fill(ChatrColors.secondary)
                                    .frame(width: 56, height: 56)
                                    .overlay(
                                        Image(systemName: "camera.rotate.fill")
                                            .foregroundColor(.white)
                                    )
                            }
                            
                            // Speaker
                            Button(action: onToggleAudioRoute) {
                                Circle()
                                    .fill(audioRoute == .speaker ? ChatrColors.primary : ChatrColors.secondary)
                                    .frame(width: 56, height: 56)
                                    .overlay(
                                        Image(systemName: audioRouteIcon(audioRoute))
                                            .foregroundColor(.white)
                                    )
                            }
                        }
                        
                        // End call button
                        Button(action: onEndCall) {
                            Circle()
                                .fill(Color.red)
                                .frame(width: 64, height: 64)
                                .overlay(
                                    Image(systemName: "phone.down.fill")
                                        .font(.system(size: 28))
                                        .foregroundColor(.white)
                                )
                        }
                    }
                    .padding(.vertical, 24)
                    .padding(.horizontal, 16)
                    .background(Color.black.opacity(0.5))
                }
            }
        }
        .onAppear {
            Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
                duration += 1
            }
        }
        .onTapGesture {
            showControls.toggle()
        }
    }
    
    private func formatDuration(_ seconds: Int) -> String {
        let mins = seconds / 60
        let secs = seconds % 60
        return String(format: "%02d:%02d", mins, secs)
    }
    
    private func audioRouteIcon(_ route: AudioRoute) -> String {
        switch route {
        case .speaker:
            return "speaker.wave.3.fill"
        case .bluetooth:
            return "airpodspro"
        default:
            return "speaker.wave.1.fill"
        }
    }
}

// Helper view for rendering WebRTC video
struct RTCVideoView: UIViewRepresentable {
    let videoTrack: RTCVideoTrack
    
    func makeUIView(context: Context) -> RTCMTLVideoView {
        let view = RTCMTLVideoView()
        view.videoContentMode = .scaleAspectFill
        videoTrack.add(view)
        return view
    }
    
    func updateUIView(_ uiView: RTCMTLVideoView, context: Context) {}
    
    static func dismantleUIView(_ uiView: RTCMTLVideoView, coordinator: ()) {
        // Clean up
    }
}
