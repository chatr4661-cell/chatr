import SwiftUI

struct IncomingCallView: View {
    let callerName: String
    let callerAvatar: String?
    let isVideo: Bool
    let onAccept: () -> Void
    let onReject: () -> Void
    
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
                    Text(isVideo ? "Incoming Video Call" : "Incoming Call")
                        .font(.system(size: 16))
                        .foregroundColor(.white.opacity(0.7))
                    
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
                    
                    Text("Ringing...")
                        .font(.system(size: 14))
                        .foregroundColor(.white.opacity(0.7))
                }
                .padding(.top, 64)
                
                Spacer()
                
                // Bottom action buttons
                HStack(spacing: 60) {
                    // Reject button
                    Button(action: onReject) {
                        Circle()
                            .fill(Color.red)
                            .frame(width: 72, height: 72)
                            .overlay(
                                Image(systemName: "xmark")
                                    .font(.system(size: 32))
                                    .foregroundColor(.white)
                            )
                    }
                    
                    // Accept button
                    Button(action: onAccept) {
                        Circle()
                            .fill(Color.green)
                            .frame(width: 72, height: 72)
                            .overlay(
                                Image(systemName: isVideo ? "video.fill" : "phone.fill")
                                    .font(.system(size: 32))
                                    .foregroundColor(.white)
                            )
                    }
                }
                .padding(.bottom, 48)
            }
        }
    }
}
