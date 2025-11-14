import SwiftUI

extension Color {
    // Primary colors matching CHATR web app
    static let chatrPrimary = Color(hex: "9b87f5")
    static let chatrPrimaryForeground = Color.white
    static let chatrPrimaryGlow = Color(hex: "D6BCFA")
    
    // Background colors
    static let chatrBackground = Color(hex: "1A1F2C")
    static let chatrBackgroundSecondary = Color(hex: "221F26")
    static let chatrForeground = Color.white
    
    // Accent colors
    static let chatrAccent = Color(hex: "FDE1D3")
    static let chatrAccentForeground = Color(hex: "1A1F2C")
    
    // Muted colors
    static let chatrMuted = Color(hex: "403E43")
    static let chatrMutedForeground = Color(hex: "A19BA8")
    
    // Border & Input
    static let chatrBorder = Color(hex: "403E43")
    static let chatrInput = Color(hex: "403E43")
    
    // Card colors
    static let chatrCard = Color(hex: "221F26")
    static let chatrCardForeground = Color.white
    
    // Destructive
    static let chatrDestructive = Color(hex: "EF4444")
    static let chatrDestructiveForeground = Color.white
    
    // Success
    static let chatrSuccess = Color(hex: "22C55E")
    
    // Warning
    static let chatrWarning = Color(hex: "F59E0B")
    
    // Initialize from hex string
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
