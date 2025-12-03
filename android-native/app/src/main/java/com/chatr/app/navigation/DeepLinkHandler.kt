package com.chatr.app.navigation

import android.content.Intent
import android.net.Uri
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DeepLinkHandler @Inject constructor() {
    
    companion object {
        const val SCHEME_HTTPS = "https"
        const val SCHEME_CHATR = "chatr"
        const val HOST_CHATR = "chatr.chat"
        const val HOST_WWW_CHATR = "www.chatr.chat"
    }
    
    fun parseDeepLink(intent: Intent): DeepLinkDestination? {
        val uri = intent.data ?: return null
        return parseUri(uri)
    }
    
    fun parseUri(uri: Uri): DeepLinkDestination? {
        val path = uri.path ?: ""
        val pathSegments = uri.pathSegments
        
        return when {
            // Home
            path == "/" || path.isEmpty() -> DeepLinkDestination.Home
            
            // Auth
            path == "/auth" -> DeepLinkDestination.Auth
            
            // Chat
            path.startsWith("/chat/") && pathSegments.size >= 2 -> {
                DeepLinkDestination.Chat(pathSegments[1])
            }
            
            // Profile
            path.startsWith("/profile/") && pathSegments.size >= 2 -> {
                DeepLinkDestination.Profile(pathSegments[1])
            }
            
            // Contacts
            path == "/contacts" -> DeepLinkDestination.Contacts
            
            // Call History
            path == "/call-history" || path == "/calls" -> DeepLinkDestination.CallHistory
            
            // Call
            path.startsWith("/call/") && pathSegments.size >= 2 -> {
                DeepLinkDestination.Call(pathSegments[1])
            }
            
            // Stories
            path == "/stories" -> DeepLinkDestination.Stories
            
            // Communities
            path == "/communities" -> DeepLinkDestination.Communities
            
            // Health
            path == "/health" -> DeepLinkDestination.Health
            
            // Care
            path == "/care" -> DeepLinkDestination.Care
            
            // Jobs
            path == "/local-jobs" || path == "/jobs" -> {
                DeepLinkDestination.Jobs(uri.getQueryParameter("q"))
            }
            
            // Healthcare
            path == "/local-healthcare" || path == "/healthcare" -> {
                DeepLinkDestination.Healthcare(
                    uri.getQueryParameter("lat")?.toDoubleOrNull(),
                    uri.getQueryParameter("lon")?.toDoubleOrNull()
                )
            }
            
            // Food
            path == "/food-ordering" || path == "/food" -> DeepLinkDestination.Food
            
            // Deals
            path == "/local-deals" || path == "/deals" -> DeepLinkDestination.Deals
            
            // Search
            path == "/search" -> {
                DeepLinkDestination.Search(uri.getQueryParameter("q"))
            }
            
            // AI Browser
            path == "/ai-browser" -> {
                DeepLinkDestination.AIBrowser(uri.getQueryParameter("url"))
            }
            
            // AI Agents
            path == "/ai-agents" -> DeepLinkDestination.AIAgents
            path.startsWith("/ai-agents/chat/") && pathSegments.size >= 3 -> {
                DeepLinkDestination.AIAgentChat(pathSegments[2])
            }
            
            // AI Assistant
            path == "/ai-assistant" -> DeepLinkDestination.AIAssistant
            
            // Chatr Plus
            path == "/chatr-plus" || path == "/plus" -> DeepLinkDestination.ChatrPlus
            path.startsWith("/chatr-plus/service/") && pathSegments.size >= 3 -> {
                DeepLinkDestination.ChatrPlusService(pathSegments[2])
            }
            path.startsWith("/chatr-plus/category/") && pathSegments.size >= 3 -> {
                DeepLinkDestination.ChatrPlusCategory(pathSegments[2])
            }
            
            // Seller
            path == "/seller/portal" || path == "/seller" -> DeepLinkDestination.Seller
            
            // Business
            path == "/business" -> DeepLinkDestination.Business
            
            // Settings
            path == "/settings" -> DeepLinkDestination.Settings
            
            // Notifications
            path == "/notifications" -> DeepLinkDestination.Notifications
            
            // Points
            path == "/chatr-points" || path == "/points" -> DeepLinkDestination.ChatrPoints
            
            // Rewards
            path == "/reward-shop" || path == "/rewards" -> DeepLinkDestination.Rewards
            
            // Wallet
            path == "/wallet" -> DeepLinkDestination.Wallet
            
            // QR Payment
            path == "/qr-payment" || path == "/qr-pay" -> {
                DeepLinkDestination.QRPayment(
                    uri.getQueryParameter("amount")?.toIntOrNull(),
                    uri.getQueryParameter("to")
                )
            }
            
            // Emergency
            path == "/emergency" -> DeepLinkDestination.Emergency
            
            // Fame Cam
            path == "/fame-cam" -> DeepLinkDestination.FameCam
            
            // Chatr World
            path == "/chatr-world" || path == "/world" -> DeepLinkDestination.ChatrWorld
            
            // Native Apps
            path == "/native-apps" || path == "/apps" -> DeepLinkDestination.NativeApps
            
            else -> null
        }
    }
    
    fun createDeepLinkUri(destination: DeepLinkDestination): Uri {
        return when (destination) {
            is DeepLinkDestination.Home -> Uri.parse("chatr://home")
            is DeepLinkDestination.Auth -> Uri.parse("chatr://auth")
            is DeepLinkDestination.Chat -> Uri.parse("chatr://chat/${destination.conversationId}")
            is DeepLinkDestination.Profile -> Uri.parse("chatr://profile/${destination.userId}")
            is DeepLinkDestination.Contacts -> Uri.parse("chatr://contacts")
            is DeepLinkDestination.CallHistory -> Uri.parse("chatr://calls")
            is DeepLinkDestination.Call -> Uri.parse("chatr://call/${destination.callId}")
            is DeepLinkDestination.Stories -> Uri.parse("chatr://stories")
            is DeepLinkDestination.Communities -> Uri.parse("chatr://communities")
            is DeepLinkDestination.Health -> Uri.parse("chatr://health")
            is DeepLinkDestination.Care -> Uri.parse("chatr://care")
            is DeepLinkDestination.Jobs -> {
                val builder = Uri.Builder().scheme("chatr").authority("jobs")
                destination.query?.let { builder.appendQueryParameter("q", it) }
                builder.build()
            }
            is DeepLinkDestination.Healthcare -> {
                val builder = Uri.Builder().scheme("chatr").authority("healthcare")
                destination.lat?.let { builder.appendQueryParameter("lat", it.toString()) }
                destination.lon?.let { builder.appendQueryParameter("lon", it.toString()) }
                builder.build()
            }
            is DeepLinkDestination.Food -> Uri.parse("chatr://food")
            is DeepLinkDestination.Deals -> Uri.parse("chatr://deals")
            is DeepLinkDestination.Search -> {
                val builder = Uri.Builder().scheme("chatr").authority("search")
                destination.query?.let { builder.appendQueryParameter("q", it) }
                builder.build()
            }
            is DeepLinkDestination.AIBrowser -> {
                val builder = Uri.Builder().scheme("chatr").authority("ai-browser")
                destination.url?.let { builder.appendQueryParameter("url", it) }
                builder.build()
            }
            is DeepLinkDestination.AIAgents -> Uri.parse("chatr://ai-agents")
            is DeepLinkDestination.AIAgentChat -> Uri.parse("chatr://ai-agent/${destination.agentId}")
            is DeepLinkDestination.AIAssistant -> Uri.parse("chatr://ai-assistant")
            is DeepLinkDestination.ChatrPlus -> Uri.parse("chatr://plus")
            is DeepLinkDestination.ChatrPlusService -> Uri.parse("chatr://service/${destination.serviceId}")
            is DeepLinkDestination.ChatrPlusCategory -> Uri.parse("chatr://category/${destination.slug}")
            is DeepLinkDestination.Seller -> Uri.parse("chatr://seller")
            is DeepLinkDestination.Business -> Uri.parse("chatr://business")
            is DeepLinkDestination.Settings -> Uri.parse("chatr://settings")
            is DeepLinkDestination.Notifications -> Uri.parse("chatr://notifications")
            is DeepLinkDestination.ChatrPoints -> Uri.parse("chatr://points")
            is DeepLinkDestination.Rewards -> Uri.parse("chatr://rewards")
            is DeepLinkDestination.Wallet -> Uri.parse("chatr://wallet")
            is DeepLinkDestination.QRPayment -> {
                val builder = Uri.Builder().scheme("chatr").authority("qr-pay")
                destination.amount?.let { builder.appendQueryParameter("amount", it.toString()) }
                destination.to?.let { builder.appendQueryParameter("to", it) }
                builder.build()
            }
            is DeepLinkDestination.Emergency -> Uri.parse("chatr://emergency")
            is DeepLinkDestination.FameCam -> Uri.parse("chatr://fame-cam")
            is DeepLinkDestination.ChatrWorld -> Uri.parse("chatr://world")
            is DeepLinkDestination.NativeApps -> Uri.parse("chatr://apps")
        }
    }
}

sealed class DeepLinkDestination {
    object Home : DeepLinkDestination()
    object Auth : DeepLinkDestination()
    data class Chat(val conversationId: String) : DeepLinkDestination()
    data class Profile(val userId: String) : DeepLinkDestination()
    object Contacts : DeepLinkDestination()
    object CallHistory : DeepLinkDestination()
    data class Call(val callId: String) : DeepLinkDestination()
    object Stories : DeepLinkDestination()
    object Communities : DeepLinkDestination()
    object Health : DeepLinkDestination()
    object Care : DeepLinkDestination()
    data class Jobs(val query: String?) : DeepLinkDestination()
    data class Healthcare(val lat: Double?, val lon: Double?) : DeepLinkDestination()
    object Food : DeepLinkDestination()
    object Deals : DeepLinkDestination()
    data class Search(val query: String?) : DeepLinkDestination()
    data class AIBrowser(val url: String?) : DeepLinkDestination()
    object AIAgents : DeepLinkDestination()
    data class AIAgentChat(val agentId: String) : DeepLinkDestination()
    object AIAssistant : DeepLinkDestination()
    object ChatrPlus : DeepLinkDestination()
    data class ChatrPlusService(val serviceId: String) : DeepLinkDestination()
    data class ChatrPlusCategory(val slug: String) : DeepLinkDestination()
    object Seller : DeepLinkDestination()
    object Business : DeepLinkDestination()
    object Settings : DeepLinkDestination()
    object Notifications : DeepLinkDestination()
    object ChatrPoints : DeepLinkDestination()
    object Rewards : DeepLinkDestination()
    object Wallet : DeepLinkDestination()
    data class QRPayment(val amount: Int?, val to: String?) : DeepLinkDestination()
    object Emergency : DeepLinkDestination()
    object FameCam : DeepLinkDestination()
    object ChatrWorld : DeepLinkDestination()
    object NativeApps : DeepLinkDestination()
}
