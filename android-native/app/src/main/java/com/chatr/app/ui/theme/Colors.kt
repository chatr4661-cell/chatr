package com.chatr.app.ui.theme

import androidx.compose.ui.graphics.Color

/**
 * =========================================
 * CHATR+ DESIGN SYSTEM COLORS
 * =========================================
 * 
 * Matches the exact same colors, fonts, spacing,
 * padding, and card UI as CHATR Web (chatr.chat)
 * 
 * All colors use HSL values converted to RGB for Compose
 */

// ===========================================
// PRIMARY COLORS (Purple gradient theme)
// ===========================================

// Primary - hsl(265, 100%, 47%) → #6200EE
val Primary = Color(0xFF6200EE)
val OnPrimary = Color(0xFFFFFFFF)
val PrimaryContainer = Color(0xFFBB86FC)
val OnPrimaryContainer = Color(0xFF3700B3)

// Primary dark mode
val PrimaryDark = Color(0xFFBB86FC)
val OnPrimaryDark = Color(0xFF000000)
val PrimaryContainerDark = Color(0xFF3700B3)
val OnPrimaryContainerDark = Color(0xFFEFDBFF)

// Primary foreground (for text on primary backgrounds)
val PrimaryForeground = Color(0xFFFFFFFF)

// ===========================================
// SECONDARY COLORS (Teal/Cyan)
// ===========================================

val Secondary = Color(0xFF03DAC6)
val OnSecondary = Color(0xFF000000)
val SecondaryContainer = Color(0xFF005047)
val OnSecondaryContainer = Color(0xFF6FF6EC)

val SecondaryDark = Color(0xFF03DAC6)
val OnSecondaryDark = Color(0xFF000000)
val SecondaryContainerDark = Color(0xFF005047)
val OnSecondaryContainerDark = Color(0xFF6FF6EC)

// ===========================================
// TERTIARY COLORS
// ===========================================

val Tertiary = Color(0xFF018786)
val OnTertiary = Color(0xFFFFFFFF)
val TertiaryContainer = Color(0xFF8EFFE1)
val OnTertiaryContainer = Color(0xFF00312E)

val TertiaryDark = Color(0xFF4CFFDF)
val OnTertiaryDark = Color(0xFF00312E)
val TertiaryContainerDark = Color(0xFF005047)
val OnTertiaryContainerDark = Color(0xFF8EFFE1)

// ===========================================
// ERROR COLORS
// ===========================================

val Error = Color(0xFFB00020)
val OnError = Color(0xFFFFFFFF)
val ErrorContainer = Color(0xFFFFDAD6)
val OnErrorContainer = Color(0xFF410002)

val ErrorDark = Color(0xFFCF6679)
val OnErrorDark = Color(0xFF690005)
val ErrorContainerDark = Color(0xFF93000A)
val OnErrorContainerDark = Color(0xFFFFDAD6)

// ===========================================
// BACKGROUND & SURFACE (Light mode)
// ===========================================

val Background = Color(0xFFFFFBFE)
val OnBackground = Color(0xFF1C1B1F)
val Surface = Color(0xFFFFFBFE)
val OnSurface = Color(0xFF1C1B1F)
val SurfaceVariant = Color(0xFFE7E0EC)
val OnSurfaceVariant = Color(0xFF49454F)

// ===========================================
// BACKGROUND & SURFACE (Dark mode)
// ===========================================

val BackgroundDark = Color(0xFF1C1B1F)
val OnBackgroundDark = Color(0xFFE6E1E5)
val SurfaceDark = Color(0xFF1C1B1F)
val OnSurfaceDark = Color(0xFFE6E1E5)
val SurfaceVariantDark = Color(0xFF49454F)
val OnSurfaceVariantDark = Color(0xFFCAC4D0)

// ===========================================
// OUTLINE COLORS
// ===========================================

val Outline = Color(0xFF79747E)
val OutlineVariant = Color(0xFFCAC4D0)
val Scrim = Color(0xFF000000)

val OutlineDark = Color(0xFF938F99)
val OutlineVariantDark = Color(0xFF49454F)
val ScrimDark = Color(0xFF000000)

// ===========================================
// SEMANTIC COLORS (from web app)
// ===========================================

val Success = Color(0xFF10B981)        // Green - hsl(158, 84%, 40%)
val Warning = Color(0xFFF59E0B)        // Amber - hsl(43, 96%, 50%)
val Info = Color(0xFF3B82F6)           // Blue - hsl(217, 91%, 60%)
val Destructive = Color(0xFFEF4444)    // Red - hsl(0, 84%, 60%)

// ===========================================
// CARD & COMPONENT COLORS
// ===========================================

val Card = Color(0xFFFFFFFF)
val CardDark = Color(0xFF2D2D30)
val CardForeground = Color(0xFF1C1B1F)
val CardForegroundDark = Color(0xFFE6E1E5)

val Muted = Color(0xFFF4F4F5)
val MutedDark = Color(0xFF27272A)
val MutedForeground = Color(0xFF71717A)
val MutedForegroundDark = Color(0xFFA1A1AA)

val Foreground = Color(0xFF09090B)
val ForegroundDark = Color(0xFFFAFAFA)

val Border = Color(0xFFE4E4E7)
val BorderDark = Color(0xFF27272A)

val Ring = Color(0xFF6200EE)
val RingDark = Color(0xFFBB86FC)

// ===========================================
// GRADIENT COLORS (for header/hero sections)
// ===========================================

val GradientStart = Color(0xFF6200EE)
val GradientEnd = Color(0xFFBB86FC)
val GradientStartDark = Color(0xFF3700B3)
val GradientEndDark = Color(0xFF6200EE)

// ===========================================
// ONLINE STATUS COLORS
// ===========================================

val OnlineIndicator = Color(0xFF10B981)
val OfflineIndicator = Color(0xFF71717A)
val AwayIndicator = Color(0xFFF59E0B)
val BusyIndicator = Color(0xFFEF4444)
