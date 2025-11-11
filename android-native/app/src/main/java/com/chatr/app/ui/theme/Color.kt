package com.chatr.app.ui.theme

import androidx.compose.ui.graphics.Color

/**
 * Color palette for Chatr+ app
 * 
 * These colors match the existing web app design system
 * defined in src/index.css and tailwind.config.ts
 * 
 * All colors use HSL values converted to RGB for Compose
 */

// Primary colors (Purple/Blue theme from web app)
val Primary = Color(0xFF6200EE)  // hsl(265, 100%, 47%)
val OnPrimary = Color(0xFFFFFFFF)
val PrimaryContainer = Color(0xFFBB86FC)
val OnPrimaryContainer = Color(0xFF3700B3)

// Primary dark mode
val PrimaryDark = Color(0xFFBB86FC)
val OnPrimaryDark = Color(0xFF000000)
val PrimaryContainerDark = Color(0xFF3700B3)
val OnPrimaryContainerDark = Color(0xFFEFDBFF)

// Secondary colors
val Secondary = Color(0xFF03DAC6)
val OnSecondary = Color(0xFF000000)
val SecondaryContainer = Color(0xFF005047)
val OnSecondaryContainer = Color(0xFF6FF6EC)

// Secondary dark mode
val SecondaryDark = Color(0xFF03DAC6)
val OnSecondaryDark = Color(0xFF000000)
val SecondaryContainerDark = Color(0xFF005047)
val OnSecondaryContainerDark = Color(0xFF6FF6EC)

// Tertiary colors
val Tertiary = Color(0xFF018786)
val OnTertiary = Color(0xFFFFFFFF)
val TertiaryContainer = Color(0xFF8EFFE1)
val OnTertiaryContainer = Color(0xFF00312E)

// Tertiary dark mode
val TertiaryDark = Color(0xFF4CFFDF)
val OnTertiaryDark = Color(0xFF00312E)
val TertiaryContainerDark = Color(0xFF005047)
val OnTertiaryContainerDark = Color(0xFF8EFFE1)

// Error colors
val Error = Color(0xFFB00020)
val OnError = Color(0xFFFFFFFF)
val ErrorContainer = Color(0xFFFFDAD6)
val OnErrorContainer = Color(0xFF410002)

// Error dark mode
val ErrorDark = Color(0xFFCF6679)
val OnErrorDark = Color(0xFF690005)
val ErrorContainerDark = Color(0xFF93000A)
val OnErrorContainerDark = Color(0xFFFFDAD6)

// Background & Surface (Light mode)
val Background = Color(0xFFFFFBFE)
val OnBackground = Color(0xFF1C1B1F)
val Surface = Color(0xFFFFFBFE)
val OnSurface = Color(0xFF1C1B1F)
val SurfaceVariant = Color(0xFFE7E0EC)
val OnSurfaceVariant = Color(0xFF49454F)

// Background & Surface (Dark mode)
val BackgroundDark = Color(0xFF1C1B1F)
val OnBackgroundDark = Color(0xFFE6E1E5)
val SurfaceDark = Color(0xFF1C1B1F)
val OnSurfaceDark = Color(0xFFE6E1E5)
val SurfaceVariantDark = Color(0xFF49454F)
val OnSurfaceVariantDark = Color(0xFFCAC4D0)

// Outline colors
val Outline = Color(0xFF79747E)
val OutlineVariant = Color(0xFFCAC4D0)
val Scrim = Color(0xFF000000)

// Outline dark mode
val OutlineDark = Color(0xFF938F99)
val OutlineVariantDark = Color(0xFF49454F)
val ScrimDark = Color(0xFF000000)

// Custom semantic colors (from web app)
val Success = Color(0xFF10B981)  // Green
val Warning = Color(0xFFF59E0B)  // Amber
val Info = Color(0xFF3B82F6)     // Blue
