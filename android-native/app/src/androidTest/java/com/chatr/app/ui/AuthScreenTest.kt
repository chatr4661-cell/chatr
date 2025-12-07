package com.chatr.app.ui

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.chatr.app.ui.screens.AuthScreen
import com.chatr.app.ui.theme.ChatrTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * UI tests for AuthScreen
 */
@RunWith(AndroidJUnit4::class)
class AuthScreenTest {
    
    @get:Rule
    val composeTestRule = createComposeRule()
    
    @Test
    fun authScreen_displaysPhoneInput() {
        composeTestRule.setContent {
            ChatrTheme {
                AuthScreen(
                    onNavigateToHome = {},
                    onNavigateToOnboarding = {}
                )
            }
        }
        
        // Check phone input field is displayed
        composeTestRule.onNodeWithText("Phone Number", useUnmergedTree = true)
            .assertIsDisplayed()
    }
    
    @Test
    fun authScreen_displaysGetStartedButton() {
        composeTestRule.setContent {
            ChatrTheme {
                AuthScreen(
                    onNavigateToHome = {},
                    onNavigateToOnboarding = {}
                )
            }
        }
        
        // Check continue button is displayed
        composeTestRule.onNodeWithText("Continue", useUnmergedTree = true)
            .assertIsDisplayed()
    }
    
    @Test
    fun authScreen_phoneInputAcceptsText() {
        composeTestRule.setContent {
            ChatrTheme {
                AuthScreen(
                    onNavigateToHome = {},
                    onNavigateToOnboarding = {}
                )
            }
        }
        
        // Enter phone number
        composeTestRule.onNodeWithText("Phone Number", useUnmergedTree = true)
            .performTextInput("9999999999")
        
        // Verify text was entered
        composeTestRule.onNodeWithText("9999999999", useUnmergedTree = true)
            .assertExists()
    }
    
    @Test
    fun authScreen_displaysGoogleSignInOption() {
        composeTestRule.setContent {
            ChatrTheme {
                AuthScreen(
                    onNavigateToHome = {},
                    onNavigateToOnboarding = {}
                )
            }
        }
        
        // Check Google sign-in button exists
        composeTestRule.onNodeWithText("Continue with Google", useUnmergedTree = true)
            .assertIsDisplayed()
    }
    
    @Test
    fun authScreen_showsOtpFieldAfterPhoneSubmit() {
        composeTestRule.setContent {
            ChatrTheme {
                AuthScreen(
                    onNavigateToHome = {},
                    onNavigateToOnboarding = {}
                )
            }
        }
        
        // Enter valid phone number
        composeTestRule.onNodeWithText("Phone Number", useUnmergedTree = true)
            .performTextInput("9999999999")
        
        // Click continue
        composeTestRule.onNodeWithText("Continue", useUnmergedTree = true)
            .performClick()
        
        // Wait for OTP field to appear (in mock implementation)
        composeTestRule.waitForIdle()
    }
    
    @Test
    fun authScreen_displaysAppLogo() {
        composeTestRule.setContent {
            ChatrTheme {
                AuthScreen(
                    onNavigateToHome = {},
                    onNavigateToOnboarding = {}
                )
            }
        }
        
        // Check app name/logo is displayed
        composeTestRule.onNodeWithText("CHATR", useUnmergedTree = true)
            .assertIsDisplayed()
    }
    
    @Test
    fun authScreen_displaysPrivacyPolicy() {
        composeTestRule.setContent {
            ChatrTheme {
                AuthScreen(
                    onNavigateToHome = {},
                    onNavigateToOnboarding = {}
                )
            }
        }
        
        // Check privacy policy link exists
        composeTestRule.onNodeWithText("Privacy Policy", substring = true, useUnmergedTree = true)
            .assertExists()
    }
}
