import SwiftUI

struct OngoingCallView: View {
    let callerName: String
    let isMuted: Bool
    let audioRoute: AudioRoute
    let onToggleMute: () -> Void
    let onToggleAudioRoute: () -> Void
    let onEndCall: () -> Void
    
    @State private var duration: Int = 0
    
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [ChatrColors.dark, ChatrColors.darker],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
            
            VStack(spacing: 0) {
                Spacer()
                
                // Top section
                VStack(spacing: 24) {
                    // Avatar
                    Circle()
                        .fill(ChatrColors.primary.opacity(0.2))
                        .frame(width: 120, height: 120)
                        .overlay(
                            Text(callerName.prefix(1).uppercased())
                                .font(.system(size: 48, weight: .bold))
                                .foregroundColor(.white)
                        )
                    
                    Text(callerName)
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(.white)
                    
                    Text(formatDuration(duration))
                        .font(.system(size: 18))
                        .foregroundColor(.white.opacity(0.7))
                }
                .padding(.top, 64)
                
                Spacer()
                
                // Control buttons
                VStack(spacing: 32) {
                    HStack(spacing: 40) {
                        // Mute button
                        Button(action: onToggleMute) {
                            Circle()
                                .fill(isMuted ? Color.red : ChatrColors.secondary)
                                .frame(width: 64, height: 64)
                                .overlay(
                                    Image(systemName: isMuted ? "mic.slash.fill" : "mic.fill")
                                        .font(.system(size: 24))
                                        .foregroundColor(.white)
                                )
                        }
                        
                        // Speaker button
                        Button(action: onToggleAudioRoute) {
                            Circle()
                                .fill(audioRoute == .speaker ? ChatrColors.primary : ChatrColors.secondary)
                                .frame(width: 64, height: 64)
                                .overlay(
                                    Image(systemName: audioRouteIcon(audioRoute))
                                        .font(.system(size: 24))
                                        .foregroundColor(.white)
                                )
                        }
                    }
                    
                    // End call button
                    Button(action: onEndCall) {
                        Circle()
                            .fill(Color.red)
                            .frame(width: 72, height: 72)
                            .overlay(
                                Image(systemName: "phone.down.fill")
                                    .font(.system(size: 32))
                                    .foregroundColor(.white)
                            )
                    }
                }
                .padding(.bottom, 48)
            }
        }
        .onAppear {
            Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
                duration += 1
            }
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
