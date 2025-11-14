import SwiftUI

struct EcosystemCard: View {
    let title: String
    let icon: String
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 16) {
                Image(systemName: icon)
                    .font(.system(size: 32))
                    .foregroundColor(.chatrPrimary)
                
                Text(title)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.chatrForeground)
                    .lineLimit(2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
            .frame(height: 120)
            .background(
                LinearGradient(
                    colors: [
                        Color.chatrCard,
                        Color.chatrCard.opacity(0.8)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .cornerRadius(16)
            .shadow(color: .black.opacity(0.1), radius: 4, y: 2)
        }
    }
}
