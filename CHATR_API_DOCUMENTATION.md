# CHATR Complete API & Route Documentation

> Auto-generated comprehensive documentation for chatr.chat domain
> Last Updated: 2026-01-02
> Version: 3.0.0

---

## Table of Contents
1. [Native App RPC Functions](#0-native-app-rpc-functions)
2. [REST API Routes](#1-rest-api-routes)
3. [WebSocket Routes](#2-websocket-routes)
4. [Search Engine Routes](#3-search-engine-routes)
5. [Frontend Pages](#4-frontend-pages)
6. [Android Native Architecture](#5-android-native-architecture)
7. [Android Retrofit Interfaces](#6-android-retrofit-interfaces)
8. [Deep Link Map](#7-deep-link-map)
9. [Integration Checklist](#8-integration-checklist)
10. [WebRTC & Calling Architecture](#9-webrtc--calling-architecture)
11. [CHATR Brain AI System](#10-chatr-brain-ai-system)

---

## 0. Native App RPC Functions

> **Purpose**: JWT-aware functions that infer user from token - no userId params needed.
> **Fixes**: "Unknown" user issue, "participant_user_id" column error

### 0.1 Get User Conversations

```
POST /rest/v1/rpc/get_user_conversations

Headers:
  Authorization: Bearer <access_token>
  apikey: <supabase_anon_key>
  Content-Type: application/json

Body: {}

Response:
[
  {
    "conversation_id": "uuid",
    "is_group": false,
    "group_name": null,
    "group_icon_url": null,
    "other_user_id": "uuid",
    "other_user_name": "John Doe",      // ✅ No more "Unknown"
    "other_user_avatar": "https://...",  // ✅ Pre-joined
    "other_user_online": true,
    "last_message": "Hey!",
    "last_message_type": "text",
    "last_message_at": "2025-12-21T04:30:00Z",
    "last_message_sender_id": "uuid",
    "unread_count": 3,
    "is_muted": false,
    "is_archived": false
  }
]
```

### 0.2 Get Conversation Messages

```
POST /rest/v1/rpc/get_conversation_messages

Headers:
  Authorization: Bearer <access_token>
  apikey: <supabase_anon_key>
  Content-Type: application/json

Body:
{
  "p_conversation_id": "uuid",
  "p_limit": 50,
  "p_before": "2025-12-21T04:30:00Z"  // Optional pagination
}

Response:
[
  {
    "message_id": "uuid",
    "sender_id": "uuid",
    "sender_name": "John Doe",        // ✅ Pre-joined
    "sender_avatar": "https://...",   // ✅ Pre-joined
    "content": "Hello!",
    "message_type": "text",
    "created_at": "2025-12-21T04:30:00Z",
    "is_edited": false,
    "is_deleted": false,
    "is_starred": false,
    "reply_to_id": null,
    "media_url": null,
    "media_attachments": [],
    "reactions": [],
    "status": "delivered"
  }
]
```

### 0.3 Database Schema Reference

```
conversations
├── id (UUID, PK)
├── is_group (BOOLEAN)
├── group_name (TEXT)
├── group_icon_url (TEXT)
├── created_by (UUID)
└── created_at (TIMESTAMPTZ)

conversation_participants (Join Table)
├── id (UUID, PK)
├── conversation_id (UUID, FK)
├── user_id (UUID, FK → profiles)
├── role (TEXT: 'member'|'admin'|'owner')
├── is_muted (BOOLEAN)
├── is_archived (BOOLEAN)
└── last_read_at (TIMESTAMPTZ)

messages
├── id (UUID, PK)
├── conversation_id (UUID, FK)
├── sender_id (UUID, FK → profiles)
├── content (TEXT)
├── message_type (TEXT)
├── status (TEXT: 'sent'|'delivered'|'read')
├── reactions (JSONB)
└── created_at (TIMESTAMPTZ)

profiles
├── id (UUID, PK = auth.users.id)
├── username (TEXT)
├── avatar_url (TEXT)
├── is_online (BOOLEAN)
└── email (TEXT)
```

---

## 1. REST API Routes

### Base URL
```
Production: https://sbayuqgomlflmxgicplz.supabase.co/functions/v1
```

### 1.1 Authentication Service

| Method | Endpoint | Description | Auth | Request Body |
|--------|----------|-------------|------|--------------|
| POST | `/auth/signup` | User registration | No | `{ email, password, phone_number }` |
| POST | `/auth/signin` | User login | No | `{ email, password }` OR `{ phone, otp }` |
| POST | `/auth/signout` | User logout | Yes | - |
| POST | `/auth/refresh` | Refresh token | Yes | `{ refresh_token }` |
| POST | `/auth/otp/send` | Send OTP | No | `{ phone_number }` |
| POST | `/auth/otp/verify` | Verify OTP | No | `{ phone_number, otp }` |
| GET | `/auth/user` | Get current user | Yes | - |

### 1.2 Users Service

| Method | Endpoint | Description | Auth | Request/Response |
|--------|----------|-------------|------|------------------|
| GET | `/users/{userId}` | Get user by ID | Yes | Response: `User` |
| GET | `/users` | List users | Yes | Response: `List<User>` |
| PUT | `/users/{userId}` | Update user | Yes | `{ username, avatar_url, bio }` |
| GET | `/users/search` | Search users | Yes | Query: `?q=search_term` |
| POST | `/users/online-status` | Update online status | Yes | `{ is_online: boolean }` |

### 1.3 Messages Service

| Method | Endpoint | Description | Auth | Request/Response |
|--------|----------|-------------|------|------------------|
| GET | `/chats/{chatId}/messages` | Get messages | Yes | Query: `?limit=50&offset=0` |
| POST | `/messages` | Send message | Yes | `{ conversation_id, content, type }` |
| PUT | `/messages/{id}` | Edit message | Yes | `{ content }` |
| DELETE | `/messages/{id}` | Delete message | Yes | - |
| POST | `/messages/{id}/read` | Mark as read | Yes | - |
| POST | `/messages/{id}/reaction` | Toggle reaction | Yes | `{ emoji }` - Uses `toggle_message_reaction` RPC |
| POST | `/messages/{id}/pin` | Pin message | Yes | - |
| POST | `/messages/{id}/star` | Star message | Yes | - |
| POST | `/messages/{id}/forward` | Forward message | Yes | `{ conversation_ids: string[] }` |
| GET | `/messages/search` | Search messages | Yes | Query: `?q=term&conversation_id=xxx` |

### 1.4 Chats/Conversations Service

| Method | Endpoint | Description | Auth | Request/Response |
|--------|----------|-------------|------|------------------|
| GET | `/chats` | Get user chats | Yes | Query: `?userId=xxx` |
| POST | `/chats` | Create chat | Yes | `{ participants: string[] }` |
| GET | `/chats/{chatId}` | Get chat details | Yes | Response: `Chat` |
| DELETE | `/chats/{chatId}` | Delete chat | Yes | - |
| POST | `/chats/{chatId}/participants` | Add participant | Yes | `{ user_id }` |
| DELETE | `/chats/{chatId}/participants/{userId}` | Remove participant | Yes | - |

### 1.5 Calls Service

| Method | Endpoint | Description | Auth | Request/Response |
|--------|----------|-------------|------|------------------|
| POST | `/calls/initiate` | Start call | Yes | `{ receiver_id, type: "audio"|"video" }` |
| POST | `/calls/{callId}/accept` | Accept call | Yes | Response: `CallData` |
| POST | `/calls/{callId}/reject` | Reject call | Yes | Response: `CallData` |
| POST | `/calls/{callId}/end` | End call | Yes | Response: `CallData` |
| GET | `/calls/history` | Call history | Yes | Query: `?limit=50` |

### 1.6 Contacts Service

| Method | Endpoint | Description | Auth | Request/Response |
|--------|----------|-------------|------|------------------|
| POST | `/contacts/sync` | Sync contacts | Yes | `{ contacts: ContactInfo[] }` - Uses `sync_user_contacts` RPC |
| GET | `/contacts` | Get contacts | Yes | Response: `List<Contact>` |
| POST | `/contacts/block` | Block contact | Yes | `{ user_id, reason? }` |
| DELETE | `/contacts/block/{userId}` | Unblock contact | Yes | - |
| GET | `/contacts/blocked` | Get blocked users | Yes | Response: `List<BlockedContact>` |

### 1.6.1 Privacy Settings

| Method | Endpoint | Description | Auth | Request/Response |
|--------|----------|-------------|------|------------------|
| GET | `/users/{userId}/privacy` | Get privacy settings | Yes | Response: `PrivacySettings` |
| PUT | `/users/{userId}/privacy` | Update privacy settings | Yes | `{ last_seen, profile_photo, about, read_receipts, groups_add }` |

### 1.7 Social/Stories Service

| Method | Endpoint | Description | Auth | Request/Response |
|--------|----------|-------------|------|------------------|
| GET | `/stories` | Get stories feed | Yes | Response: `List<Story>` |
| POST | `/stories` | Create story | Yes | `{ media_url, caption, type }` |
| DELETE | `/stories/{id}` | Delete story | Yes | - |
| POST | `/stories/{id}/view` | Mark story viewed | Yes | - |
| GET | `/communities` | List communities | Yes | Response: `List<Community>` |
| POST | `/communities` | Create community | Yes | `{ name, description }` |

### 1.8 Notifications Service

| Method | Endpoint | Description | Auth | Request/Response |
|--------|----------|-------------|------|------------------|
| GET | `/notifications` | Get notifications | Yes | Query: `?limit=50&unread=true` |
| POST | `/notifications/read` | Mark as read | Yes | `{ notification_ids: string[] }` |
| POST | `/device/register` | Register FCM token | Yes | `{ fcm_token, platform }` |
| POST | `send-push-notification` | Send push | Yes | `{ user_id, title, body }` |
| POST | `send-chat-notification` | Chat notification | Yes | `{ conversation_id, message }` |

### 1.9 Search Service

| Method | Endpoint | Description | Auth | Request/Response |
|--------|----------|-------------|------|------------------|
| POST | `universal-search` | Universal search | No | `{ query, lat?, lon?, category? }` |
| POST | `ai-browser-search` | AI-powered search | Yes | `{ query, context? }` |
| POST | `visual-search` | Image-based search | No | `{ imageUrl?, imageBase64? }` |
| POST | `geo-search` | Location search | No | `{ query, lat, lon, radius? }` |
| POST | `perplexity-search` | Deep web search | No | `{ query }` |
| POST | `click-log` | Log search clicks | No | `{ query, url, position }` |

### 1.10 AI Services

| Method | Endpoint | Description | Auth | Request/Response |
|--------|----------|-------------|------|------------------|
| POST | `ai-assistant` | AI assistant chat | No | `{ message, context? }` |
| POST | `ai-agent-chat` | AI agent conversation | Yes | `{ agent_id, message }` |
| POST | `ai-answer` | Get AI answer | No | `{ query, context? }` |
| POST | `ai-health-assistant` | Health AI | No | `{ symptoms, history? }` |
| POST | `ai-smart-reply` | Smart reply suggestions | No | `{ conversation_context }` |
| POST | `smart-compose` | AI compose | Yes | `{ partial_text, context }` |
| POST | `symptom-checker` | Symptom analysis | Yes | `{ symptoms: string[] }` |
| POST | `summarize-chat` | Chat summary | Yes | `{ conversation_id }` |
| POST | `translate-message` | Translate text | Yes | `{ text, target_lang }` |
| POST | `transcribe-voice` | Voice to text | Yes | `{ audio_url }` |

### 1.11 Location Services

| Method | Endpoint | Description | Auth | Request/Response |
|--------|----------|-------------|------|------------------|
| POST | `update-location` | Update user location | Yes | `{ lat, lon, accuracy? }` |
| POST | `geo-search` | Search nearby | No | `{ query, lat, lon, radius, category? }` |
| GET | `/geofences` | Get user geofences | Yes | Response: `List<Geofence>` |
| POST | `/geofences` | Create geofence | Yes | `{ name, lat, lon, radius }` |

### 1.12 Media Service

| Method | Endpoint | Description | Auth | Request/Response |
|--------|----------|-------------|------|------------------|
| POST | `generate-signed-url` | Get upload URL | Yes | `{ bucket, file_path }` |
| POST | `generate-media-url` | Get media URL | Yes | `{ file_path }` |
| POST | `ai-image-generator` | Generate image | Yes | `{ prompt }` |

### 1.13 Healthcare Services

| Method | Endpoint | Description | Auth | Request/Response |
|--------|----------|-------------|------|------------------|
| POST | `fetch-healthcare` | Search healthcare | No | `{ query, lat, lon }` |
| POST | `healthcare-booking` | Book appointment | Yes | `{ provider_id, date, time }` |
| POST | `health-wallet-transaction` | Wallet transaction | Yes | `{ amount, type }` |
| POST | `sync-health-data` | Sync health data | Yes | `{ data: HealthData }` |
| POST | `medication-interactions` | Check interactions | Yes | `{ medications: string[] }` |
| POST | `health-predictions` | AI health predictions | Yes | `{ health_data }` |

### 1.14 Jobs Services

| Method | Endpoint | Description | Auth | Request/Response |
|--------|----------|-------------|------|------------------|
| POST | `fetch-jobs` | Search jobs | No | `{ query, lat?, lon?, location? }` |
| POST | `scrape-jobs` | Scrape job listings | No | `{ query, location }` |
| POST | `job-matching` | AI job matching | Yes | `{ user_profile }` |

### 1.15 Payment Services

| Method | Endpoint | Description | Auth | Request/Response |
|--------|----------|-------------|------|------------------|
| POST | `qr-payment` | QR payment | Yes | `{ amount, recipient_id }` |
| POST | `process-referral` | Process referral | Yes | `{ referral_code }` |
| POST | `generate-referral-code` | Generate code | Yes | - |
| POST | `process-coin-reward` | Reward coins | Yes | `{ action_type }` |
| POST | `process-daily-login` | Daily login reward | Yes | - |

### 1.16 WebRTC Services

| Method | Endpoint | Description | Auth | Request/Response |
|--------|----------|-------------|------|------------------|
| POST | `webrtc-signaling` | WebRTC signaling | No | `{ type, sdp?, candidate? }` |
| POST | `websocket-signaling` | Dual-protocol signaling | Yes | `{ type, callId, data }` |
| POST | `get-turn-credentials` | Get TURN credentials | Yes | Response: `{ urls, username, credential }` |
| POST | `realtime-token` | Get realtime token | Yes | Response: `{ token }` |
| POST | `native-call-update` | Native call status update (service role) | Yes | `{ callId, status, userId }` |

### 1.17 FCM & Push Services

| Method | Endpoint | Description | Auth | Request/Response |
|--------|----------|-------------|------|------------------|
| POST | `fcm-notify` | Send FCM v1 push (OAuth2) | Yes | `{ userId, title, body, data }` |
| POST | `send-call-notification` | High-priority call notification | Yes | `{ callId, callerName, isVideo }` |
| POST | `send-chat-notification` | Chat message notification | Yes | `{ conversationId, message }` |
| POST | `send-push-notification` | Generic push notification | Yes | `{ userId, title, body }` |
| POST | `register-device-token` | Register FCM token | Yes | `{ token, platform }` |

### 1.18 CHATR Brain AI Services

| Method | Endpoint | Description | Auth | Request/Response |
|--------|----------|-------------|------|------------------|
| POST | `chatr-brain` | Unified AI router | Yes | `{ message, context?, agentHint? }` |
| POST | `chatr-world-ai` | Social feed AI | Yes | `{ query, context }` |
| POST | `chatr-games-ai` | Gaming AI assistant | Yes | `{ gameContext, action }` |
| POST | `universal-ai-search` | Universal AI search | Yes | `{ query, category? }` |
| POST | `mental-health-assistant` | Mental health AI | Yes | `{ message, history? }` |

## 2. WebSocket Routes

### 2.1 Signaling WebSocket
```
URL: wss://sbayuqgomlflmxgicplz.supabase.co/functions/v1/webrtc-signaling
Purpose: WebRTC call signaling
Events:
  - call-offer: { callId, from, sdp, isVideo }
  - call-answer: { callId, from, sdp }
  - call-candidate: { callId, from, candidate }
  - call-end: { callId, from, reason }
```

### 2.2 Supabase Realtime
```
URL: wss://sbayuqgomlflmxgicplz.supabase.co/realtime/v1/websocket
Purpose: Real-time database subscriptions
Channels:
  - messages: Listen for new messages
  - presence: User online/offline status
  - conversations: Chat list updates
  - notifications: Push notification delivery
  - typing: Typing indicators per conversation
```

### 2.3 Typing Indicators (Realtime Broadcast)
```typescript
// Send typing status
supabase
  .channel(`typing:${conversationId}`)
  .send({
    type: 'broadcast',
    event: 'typing',
    payload: { userId, isTyping: boolean, username }
  })

// Listen for typing
supabase
  .channel(`typing:${conversationId}`)
  .on('broadcast', { event: 'typing' }, (payload) => {
    // Show/hide typing indicator
  })
  .subscribe()
```

### 2.4 Socket.IO (Native)
```
URL: wss://api.chatr.app/socket.io
Events:
  - connect: { userId, token }
  - disconnect
  - message: { conversationId, content, type }
  - message_delivered: { messageId }
  - message_read: { messageIds }
  - typing_start: { conversationId }
  - typing_stop: { conversationId }
  - user_presence: { userId, status }
  - incoming_call: { callId, callerName, isVideo }
  - reaction_added: { messageId, emoji, userId }
```

---

## 3. Search Engine Routes

### 3.1 Universal Search
```
POST /functions/v1/universal-search
Request:
{
  "query": "restaurants near me",
  "lat": 28.5355,
  "lon": 77.3910,
  "category": "food|healthcare|jobs|deals|services",
  "limit": 20
}
Response:
{
  "results": [...],
  "aiAnswer": "...",
  "totalResults": 100
}
```

### 3.2 Visual Search
```
POST /functions/v1/visual-search
Request:
{
  "imageUrl": "https://...",
  "imageBase64": "base64...",
  "userId": "optional-uuid"
}
Response:
{
  "imageAnalysis": { objects, searchQuery },
  "results": [...],
  "aiRecommendations": "..."
}
```

### 3.3 AI Browser Search
```
POST /functions/v1/ai-browser-search
Request:
{
  "query": "how to cook pasta",
  "context": "optional context"
}
Response:
{
  "answer": "AI-generated answer",
  "sources": [{ title, url, snippet }],
  "relatedQueries": [...]
}
```

### 3.4 Geo Search
```
POST /functions/v1/geo-search
Request:
{
  "query": "hospitals",
  "lat": 28.5355,
  "lon": 77.3910,
  "radius": 5000,
  "category": "healthcare"
}
```

### 3.5 Perplexity-Style Search
```
POST /functions/v1/perplexity-search
Request:
{
  "query": "latest news on AI"
}
Response:
{
  "answer": "...",
  "citations": [...],
  "sources": [...]
}
```

### Search Categories
| Category | Endpoint | Description |
|----------|----------|-------------|
| `food` | universal-search | Restaurants, food delivery |
| `healthcare` | fetch-healthcare | Hospitals, clinics, doctors |
| `jobs` | fetch-jobs | Job listings |
| `deals` | universal-search | Local deals, offers |
| `services` | chatr-plus-ai-search | Chatr+ services |

---

## 4. Frontend Pages

### 4.1 Public Routes (No Auth Required)

| Route | Page | Description |
|-------|------|-------------|
| `/` | Index | Landing page |
| `/auth` | Auth | Login/Signup |
| `/download` | Download | App download page |
| `/install` | Install | PWA installation |
| `/onboarding` | Onboarding | User onboarding |
| `/about` | About | About us |
| `/help` | Help | Help center |
| `/contact` | Contact | Contact form |
| `/privacy` | PrivacyPolicy | Privacy policy |
| `/terms` | Terms | Terms of service |
| `/refund` | Refund | Refund policy |
| `/disclaimer` | Disclaimer | Disclaimer |
| `/search` | UniversalSearch | Global search |
| `/ai-browser-home` | AIBrowserHome | AI Browser landing |
| `/ai-browser` | AIBrowserView | AI Browser results |
| `/chatr-home` | ChatrHome | Search home |
| `/chatr-results` | ChatrResults | Search results |

### 4.2 Core Chat Routes

| Route | Page | Description |
|-------|------|-------------|
| `/home` | Home | Main home page |
| `/chat/:conversationId` | Chat | Chat conversation |
| `/chat/:conversationId/media` | MediaViewer | Media gallery |
| `/contacts` | Contacts | Contacts list |
| `/global-contacts` | GlobalContacts | Global directory |
| `/call-history` | CallHistory | Call log |
| `/smart-inbox` | SmartInbox | AI-sorted inbox |
| `/starred-messages` | StarredMessages | Starred messages |
| `/stories` | Stories | Stories feed |

### 4.3 Health & Wellness Routes

| Route | Page | Description |
|-------|------|-------------|
| `/health` | HealthHub | Health dashboard |
| `/care` | CareAccess | Care services |
| `/wellness` | WellnessTracking | Wellness tracking |
| `/health-passport` | HealthPassport | Health records |
| `/lab-reports` | LabReports | Lab results |
| `/medicine-reminders` | MedicineReminders | Medication reminders |
| `/symptom-checker` | SymptomCheckerPage | AI symptom checker |
| `/health-wallet` | HealthWalletPage | Health wallet |
| `/teleconsultation` | TeleconsultationPage | Video consultation |
| `/emergency` | EmergencyButton | Emergency SOS |
| `/emergency-services` | EmergencyServices | Emergency directory |
| `/local-healthcare` | LocalHealthcare | Nearby healthcare |

### 4.4 Discovery & Search Routes

| Route | Page | Description |
|-------|------|-------------|
| `/geo` | GeoDiscovery | Location discovery |
| `/local-jobs` | LocalJobs | Job search |
| `/food-ordering` | FoodOrdering | Food delivery |
| `/local-deals` | LocalDeals | Local deals |
| `/marketplace` | Marketplace | Marketplace |
| `/home-services` | HomeServices | Home services |

### 4.5 AI & Assistant Routes

| Route | Page | Description |
|-------|------|-------------|
| `/ai-agents` | AIAgents | AI agents marketplace |
| `/ai-agents/chat/:agentId` | AIAgentChat | Chat with AI agent |
| `/ai-assistant` | AIAssistant | AI assistant |
| `/prechu-ai` | PrechuAI | Prechu AI chat |
| `/chat-ai` | AIChat | AI conversation |

### 4.6 Community Routes

| Route | Page | Description |
|-------|------|-------------|
| `/community` | CommunitySpace | Community hub |
| `/communities` | Communities | Community list |
| `/create-community` | CreateCommunity | Create community |
| `/wellness-circles` | WellnessCircles | Wellness groups |
| `/wellness-circles/:circleId` | WellnessCircles | Specific circle |
| `/chatr-world` | ChatrWorld | Social feed |

### 4.7 Chatr+ Marketplace Routes

| Route | Page | Description |
|-------|------|-------------|
| `/chatr-plus` | ChatrPlus | Chatr+ home |
| `/chatr-plus/search` | ChatrPlusSearch | Service search |
| `/chatr-plus/subscribe` | ChatrPlusSubscribe | Subscription |
| `/chatr-plus/service/:id` | ChatrPlusServiceDetail | Service details |
| `/chatr-plus/category/:slug` | ChatrPlusCategoryPage | Category page |
| `/chatr-plus/wallet` | ChatrPlusWallet | Chatr+ wallet |
| `/subscription` | UserSubscription | User subscription |
| `/wallet` | ChatrWallet | Main wallet |

### 4.8 Seller Portal Routes

| Route | Page | Description |
|-------|------|-------------|
| `/seller` | SellerPortal | Seller dashboard |
| `/seller/portal` | SellerPortal | Seller home |
| `/seller/bookings` | SellerBookings | Manage bookings |
| `/seller/services` | SellerServices | Manage services |
| `/seller/analytics` | SellerAnalytics | Analytics |
| `/seller/messages` | SellerMessages | Customer messages |
| `/seller/settings` | SellerSettings | Settings |
| `/seller/reviews` | SellerReviews | Reviews |
| `/seller/payouts` | SellerPayouts | Payouts |
| `/seller/subscription` | SellerSubscription | Seller subscription |
| `/chatr-plus/seller-registration` | ChatrPlusSellerRegistration | Seller signup |
| `/chatr-plus/seller/dashboard` | ChatrPlusSellerDashboard | Dashboard |

### 4.9 Business Routes

| Route | Page | Description |
|-------|------|-------------|
| `/business` | BusinessDashboard | Business home |
| `/business/onboard` | BusinessOnboarding | Business signup |
| `/business/inbox` | BusinessInbox | Business inbox |
| `/business/crm` | CRMPage | CRM system |
| `/business/analytics` | BusinessAnalytics | Business analytics |
| `/business/team` | BusinessTeam | Team management |
| `/business/settings` | BusinessSettings | Business settings |
| `/business/catalog` | BusinessCatalog | Product catalog |
| `/business/broadcasts` | BusinessBroadcasts | Broadcasts |
| `/business/groups` | BusinessGroups | Customer groups |

### 4.10 Provider Routes

| Route | Page | Description |
|-------|------|-------------|
| `/provider-portal` | ProviderPortal | Provider dashboard |
| `/provider-register` | ProviderRegister | Provider signup |
| `/provider/dashboard` | ProviderDashboard | Provider home |
| `/provider/appointments` | ProviderAppointments | Appointments |
| `/provider/services` | ProviderServices | Services |
| `/provider/payments` | ProviderPayments | Payments |
| `/provider/:providerId` | ProviderDetails | Provider profile |
| `/doctor-onboarding` | DoctorOnboarding | Doctor registration |
| `/allied-healthcare` | AlliedHealthcare | Allied health |

### 4.11 Admin Routes (Protected)

| Route | Page | Description |
|-------|------|-------------|
| `/admin` | AdminDashboard | Admin home |
| `/admin/users` | AdminUsers | User management |
| `/admin/providers` | AdminProviders | Provider management |
| `/admin/analytics` | AdminAnalytics | Platform analytics |
| `/admin/payments` | AdminPayments | Payment management |
| `/admin/points` | AdminPoints | Points system |
| `/admin/settings` | AdminSettings | Admin settings |
| `/admin/announcements` | AdminAnnouncements | Announcements |
| `/admin/documents` | AdminDocuments | Documents |
| `/admin/doctor-applications` | AdminDoctorApplications | Doctor applications |
| `/admin/official-accounts` | OfficialAccountsManager | Official accounts |
| `/admin/broadcast` | BroadcastManager | Broadcast manager |
| `/admin/brand-partnerships` | BrandPartnerships | Brand partnerships |
| `/admin/app-approvals` | AppApprovals | App approvals |
| `/admin/feature-builder` | FeatureBuilder | Feature builder |
| `/admin/schema-manager` | SchemaManager | Schema manager |

### 4.12 User Settings Routes

| Route | Page | Description |
|-------|------|-------------|
| `/profile` | Profile | User profile |
| `/account` | Account | Account settings |
| `/settings` | Settings | App settings |
| `/notifications` | Notifications | Notifications |
| `/notification-settings` | NotificationSettings | Notification prefs |
| `/device-management` | DeviceManagement | Linked devices |
| `/geofences` | Geofences | Geofence settings |
| `/geofence-history` | GeofenceHistory | Geofence log |

### 4.13 Growth & Rewards Routes

| Route | Page | Description |
|-------|------|-------------|
| `/chatr-points` | ChatrPoints | Points dashboard |
| `/reward-shop` | RewardShop | Rewards store |
| `/growth` | ChatrGrowth | Growth hub |
| `/chatr-growth` | ChatrGrowth | Growth hub |
| `/referrals` | Referrals | Referral program |
| `/ambassador-program` | AmbassadorProgram | Ambassador signup |
| `/leaderboard` | ChatrPoints | Leaderboard |

### 4.14 Special Feature Routes

| Route | Page | Description |
|-------|------|-------------|
| `/native-apps` | MiniApps | App launcher |
| `/chatr-os` | ChatrOS | Chatr OS interface |
| `/os-detection` | OSDetection | OS detection |
| `/launcher` | Launcher | Home launcher |
| `/chatr-studio` | ChatrStudio | Content studio |
| `/fame-cam` | FameCam | Fame camera |
| `/fame-leaderboard` | FameLeaderboard | Fame rankings |
| `/capture` | Capture | Photo/video capture |
| `/qr-payment` | QRPayment | QR payments |
| `/qr-login` | QRLogin | QR login |
| `/bluetooth-test` | BluetoothTest | BT testing |

### 4.15 Education Routes

| Route | Page | Description |
|-------|------|-------------|
| `/chatr-tutors` | ChatrTutors | Tutoring |
| `/tutors` | ChatrTutors | Tutors |
| `/youth-engagement` | YouthEngagement | Youth hub |
| `/youth-feed` | YouthFeed | Youth content |
| `/expert-sessions` | ExpertSessions | Expert calls |

### 4.16 Developer Routes

| Route | Page | Description |
|-------|------|-------------|
| `/developer-portal` | DeveloperPortal | Developer hub |
| `/app-statistics` | AppStatistics | App stats |
| `/official-accounts` | OfficialAccounts | Official accounts |

---

## 5. Android Native Architecture

> **Critical**: CHATR uses a hybrid architecture with Capacitor WebView + Native Kotlin components

### 5.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    CHATR Android App                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Capacitor WebView (UI Shell)                 │  │
│  │  - React/TypeScript PWA                                   │  │
│  │  - Full web app functionality                             │  │
│  │  - Syncs credentials to SecureStore                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                    localStorage sync                             │
│                              ▼                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │           Native Kotlin Layer (android-native/)          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │  │
│  │  │ ChatrFire-  │  │ ChatrConn-  │  │ Supabase RPC    │   │  │
│  │  │ baseService │  │ ectionSvc   │  │ Repository      │   │  │
│  │  │ (FCM)       │  │ (Telecom)   │  │ (REST API)      │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘   │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │  │
│  │  │ Message     │  │ SecureStore │  │ Room Database   │   │  │
│  │  │ SyncWorker  │  │ (Encrypted) │  │ (Offline)       │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Key Native Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `ChatrFirebaseService` | `service/` | FCM message handling, TelecomManager invocation |
| `ChatrConnectionService` | `call/` | WhatsApp-style background call management |
| `SupabaseRpcRepository` | `data/repository/` | JWT-aware RPC calls via Retrofit REST API |
| `MessageRepository` | `data/repository/` | Offline-first message management |
| `MessageSyncWorker` | `sync/` | Background message synchronization |
| `SecureStore` | `security/` | Encrypted credential storage |
| `SimpleWebRTC` | `webrtc/` | WebRTC connection management |
| `SocketService` | `websocket/` | Real-time WebSocket communication |

### 5.3 Room Database Entities

```kotlin
// MessageEntity with proper column annotations
@Entity(tableName = "messages")
data class MessageEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "conversationId") val conversationId: String,
    @ColumnInfo(name = "senderId") val senderId: String,
    @ColumnInfo(name = "senderName") val senderName: String? = null,
    val content: String,
    val timestamp: Long,
    val type: String = "TEXT",
    val status: String = "SENT",
    @ColumnInfo(name = "syncStatus") val syncStatus: SyncStatus = SyncStatus.SYNCED,
    @ColumnInfo(name = "replyTo") val replyTo: String? = null,
    @ColumnInfo(name = "mediaUrl") val mediaUrl: String? = null,
    @ColumnInfo(name = "deliveredAt") val deliveredAt: Long? = null,
    @ColumnInfo(name = "readAt") val readAt: Long? = null
)

enum class SyncStatus { PENDING, SYNCED, FAILED }
```

### 5.4 SupabaseRestApi Interface

```kotlin
// Native Retrofit interface for RPC calls (avoids Edge Function gateway 405 errors)
interface SupabaseRestApi {
    
    @POST("rpc/get_user_conversations")
    suspend fun getUserConversations(): Response<List<ConversationResponse>>
    
    @POST("rpc/get_conversation_messages")
    suspend fun getConversationMessages(
        @Body request: GetMessagesRequest
    ): Response<List<MessageResponse>>
    
    @POST("rpc/create_direct_conversation")
    suspend fun createDirectConversation(
        @Body request: CreateConversationRequest
    ): Response<String>
    
    @POST("rpc/toggle_message_reaction")
    suspend fun toggleReaction(
        @Body request: ToggleReactionRequest
    ): Response<JsonElement>
}

// Base URL: https://sbayuqgomlflmxgicplz.supabase.co/rest/v1/
```

### 5.5 Credential Sync Flow

```
WebView localStorage          SecureStore (Native)
┌──────────────────┐          ┌──────────────────┐
│ access_token     │ ──sync──▶│ SUPABASE_TOKEN   │
│ refresh_token    │          │ REFRESH_TOKEN    │
│ user_id          │          │ USER_ID          │
└──────────────────┘          └──────────────────┘
        │                              │
        │                              ▼
        │                     ┌──────────────────┐
        │                     │ Background Repos │
        │                     │ - MessageRepo    │
        │                     │ - CallRepo       │
        │                     └──────────────────┘
```

---

## 6. Android Retrofit Interfaces

### 6.1 ChatrApi.kt (Complete Interface)

```kotlin
package com.chatr.app.data.api

import com.chatr.app.data.models.*
import retrofit2.Response
import retrofit2.http.*

interface ChatrApi {
    
    // ==================== AUTH ====================
    @POST("auth/signup")
    suspend fun signUp(@Body request: SignUpRequest): Response<AuthResponse>
    
    @POST("auth/signin")
    suspend fun signIn(@Body request: SignInRequest): Response<AuthResponse>
    
    @POST("auth/signout")
    suspend fun signOut(): Response<Unit>
    
    @POST("auth/otp/send")
    suspend fun sendOtp(@Body request: OtpRequest): Response<Unit>
    
    @POST("auth/otp/verify")
    suspend fun verifyOtp(@Body request: OtpVerifyRequest): Response<AuthResponse>
    
    @GET("auth/user")
    suspend fun getCurrentUser(): Response<User>
    
    // ==================== USERS ====================
    @GET("users/{userId}")
    suspend fun getUser(@Path("userId") userId: String): Response<User>
    
    @GET("users")
    suspend fun getUsers(): Response<List<User>>
    
    @PUT("users/{userId}")
    suspend fun updateUser(
        @Path("userId") userId: String,
        @Body request: UpdateUserRequest
    ): Response<User>
    
    @GET("users/search")
    suspend fun searchUsers(@Query("q") query: String): Response<List<User>>
    
    @POST("users/online-status")
    suspend fun updateOnlineStatus(@Body request: OnlineStatusRequest): Response<Unit>
    
    // ==================== CHATS ====================
    @GET("chats")
    suspend fun getChats(@Query("userId") userId: String): Response<List<Chat>>
    
    @POST("chats")
    suspend fun createChat(@Body request: CreateChatRequest): Response<Chat>
    
    @GET("chats/{chatId}")
    suspend fun getChat(@Path("chatId") chatId: String): Response<Chat>
    
    @DELETE("chats/{chatId}")
    suspend fun deleteChat(@Path("chatId") chatId: String): Response<Unit>
    
    @POST("chats/{chatId}/participants")
    suspend fun addParticipant(
        @Path("chatId") chatId: String,
        @Body request: ParticipantRequest
    ): Response<Unit>
    
    @DELETE("chats/{chatId}/participants/{userId}")
    suspend fun removeParticipant(
        @Path("chatId") chatId: String,
        @Path("userId") userId: String
    ): Response<Unit>
    
    // ==================== MESSAGES ====================
    @GET("chats/{chatId}/messages")
    suspend fun getMessages(
        @Path("chatId") chatId: String,
        @Query("limit") limit: Int = 50,
        @Query("offset") offset: Int = 0
    ): Response<List<Message>>
    
    @POST("messages")
    suspend fun sendMessage(@Body message: SendMessageRequest): Response<Message>
    
    @PUT("messages/{id}")
    suspend fun editMessage(
        @Path("id") messageId: String,
        @Body request: EditMessageRequest
    ): Response<Message>
    
    @DELETE("messages/{id}")
    suspend fun deleteMessage(@Path("id") messageId: String): Response<Unit>
    
    @POST("messages/{id}/read")
    suspend fun markAsRead(@Path("id") messageId: String): Response<Unit>
    
    @POST("messages/{id}/reaction")
    suspend fun addReaction(
        @Path("id") messageId: String,
        @Body request: ReactionRequest
    ): Response<Unit>
    
    // ==================== CALLS ====================
    @POST("calls/initiate")
    suspend fun initiateCall(@Body callData: InitiateCallRequest): Response<CallData>
    
    @POST("calls/{callId}/accept")
    suspend fun acceptCall(@Path("callId") callId: String): Response<CallData>
    
    @POST("calls/{callId}/reject")
    suspend fun rejectCall(@Path("callId") callId: String): Response<CallData>
    
    @POST("calls/{callId}/end")
    suspend fun endCall(@Path("callId") callId: String): Response<CallData>
    
    @GET("calls/history")
    suspend fun getCallHistory(@Query("limit") limit: Int = 50): Response<List<CallData>>
    
    // ==================== CONTACTS ====================
    @POST("contacts/sync")
    suspend fun syncContacts(@Body contacts: List<ContactInfo>): Response<List<User>>
    
    @GET("contacts")
    suspend fun getContacts(): Response<List<Contact>>
    
    @POST("contacts/block")
    suspend fun blockContact(@Body request: BlockContactRequest): Response<Unit>
    
    @DELETE("contacts/block/{userId}")
    suspend fun unblockContact(@Path("userId") userId: String): Response<Unit>
    
    // ==================== DEVICE ====================
    @POST("device/register")
    suspend fun registerDevice(@Body request: DeviceRegistrationRequest): Response<Unit>
    
    // ==================== NOTIFICATIONS ====================
    @GET("notifications")
    suspend fun getNotifications(
        @Query("limit") limit: Int = 50,
        @Query("unread") unread: Boolean = false
    ): Response<List<Notification>>
    
    @POST("notifications/read")
    suspend fun markNotificationsRead(@Body request: MarkReadRequest): Response<Unit>
    
    // ==================== STORIES ====================
    @GET("stories")
    suspend fun getStories(): Response<List<Story>>
    
    @POST("stories")
    suspend fun createStory(@Body request: CreateStoryRequest): Response<Story>
    
    @DELETE("stories/{id}")
    suspend fun deleteStory(@Path("id") storyId: String): Response<Unit>
    
    @POST("stories/{id}/view")
    suspend fun markStoryViewed(@Path("id") storyId: String): Response<Unit>
    
    // ==================== COMMUNITIES ====================
    @GET("communities")
    suspend fun getCommunities(): Response<List<Community>>
    
    @POST("communities")
    suspend fun createCommunity(@Body request: CreateCommunityRequest): Response<Community>
    
    @GET("communities/{id}")
    suspend fun getCommunity(@Path("id") communityId: String): Response<Community>
    
    @POST("communities/{id}/join")
    suspend fun joinCommunity(@Path("id") communityId: String): Response<Unit>
    
    @POST("communities/{id}/leave")
    suspend fun leaveCommunity(@Path("id") communityId: String): Response<Unit>
}
```

### 6.2 SearchApi.kt

```kotlin
package com.chatr.app.data.api

import com.chatr.app.data.models.*
import retrofit2.Response
import retrofit2.http.*

interface SearchApi {
    
    @POST("universal-search")
    suspend fun universalSearch(@Body request: UniversalSearchRequest): Response<SearchResponse>
    
    @POST("ai-browser-search")
    suspend fun aiBrowserSearch(@Body request: AISearchRequest): Response<AISearchResponse>
    
    @POST("visual-search")
    suspend fun visualSearch(@Body request: VisualSearchRequest): Response<VisualSearchResponse>
    
    @POST("geo-search")
    suspend fun geoSearch(@Body request: GeoSearchRequest): Response<SearchResponse>
    
    @POST("perplexity-search")
    suspend fun perplexitySearch(@Body request: PerplexitySearchRequest): Response<PerplexityResponse>
    
    @POST("click-log")
    suspend fun logClick(@Body request: ClickLogRequest): Response<Unit>
    
    @POST("fetch-jobs")
    suspend fun fetchJobs(@Body request: JobSearchRequest): Response<JobSearchResponse>
    
    @POST("fetch-healthcare")
    suspend fun fetchHealthcare(@Body request: HealthcareSearchRequest): Response<HealthcareResponse>
}
```

### 6.3 AIApi.kt

```kotlin
package com.chatr.app.data.api

import com.chatr.app.data.models.*
import retrofit2.Response
import retrofit2.http.*

interface AIApi {
    
    @POST("ai-assistant")
    suspend fun aiAssistant(@Body request: AIAssistantRequest): Response<AIAssistantResponse>
    
    @POST("ai-agent-chat")
    suspend fun aiAgentChat(@Body request: AIAgentChatRequest): Response<AIAgentChatResponse>
    
    @POST("ai-answer")
    suspend fun getAIAnswer(@Body request: AIAnswerRequest): Response<AIAnswerResponse>
    
    @POST("ai-health-assistant")
    suspend fun aiHealthAssistant(@Body request: AIHealthRequest): Response<AIHealthResponse>
    
    @POST("ai-smart-reply")
    suspend fun getSmartReplies(@Body request: SmartReplyRequest): Response<SmartReplyResponse>
    
    @POST("smart-compose")
    suspend fun smartCompose(@Body request: SmartComposeRequest): Response<SmartComposeResponse>
    
    @POST("symptom-checker")
    suspend fun checkSymptoms(@Body request: SymptomCheckerRequest): Response<SymptomCheckerResponse>
    
    @POST("summarize-chat")
    suspend fun summarizeChat(@Body request: SummarizeChatRequest): Response<SummarizeChatResponse>
    
    @POST("translate-message")
    suspend fun translateMessage(@Body request: TranslateRequest): Response<TranslateResponse>
    
    @POST("transcribe-voice")
    suspend fun transcribeVoice(@Body request: TranscribeRequest): Response<TranscribeResponse>
    
    @POST("ai-image-generator")
    suspend fun generateImage(@Body request: ImageGeneratorRequest): Response<ImageGeneratorResponse>
}
```

### 6.4 Data Models (Models.kt)

```kotlin
package com.chatr.app.data.models

// ==================== AUTH MODELS ====================
data class SignUpRequest(
    val email: String?,
    val password: String?,
    val phoneNumber: String?
)

data class SignInRequest(
    val email: String?,
    val password: String?,
    val phone: String?,
    val otp: String?
)

data class OtpRequest(val phoneNumber: String)

data class OtpVerifyRequest(
    val phoneNumber: String,
    val otp: String
)

data class AuthResponse(
    val accessToken: String,
    val refreshToken: String,
    val user: User,
    val expiresIn: Long
)

// ==================== USER MODELS ====================
data class User(
    val id: String,
    val email: String?,
    val phoneNumber: String?,
    val username: String?,
    val avatarUrl: String?,
    val isOnline: Boolean = false,
    val lastSeen: Long? = null,
    val bio: String? = null
)

data class UpdateUserRequest(
    val username: String?,
    val avatarUrl: String?,
    val bio: String?
)

data class OnlineStatusRequest(val isOnline: Boolean)

// ==================== MESSAGE MODELS ====================
data class Message(
    val id: String,
    val conversationId: String,
    val senderId: String,
    val content: String,
    val timestamp: Long,
    val type: MessageType = MessageType.TEXT,
    val status: MessageStatus = MessageStatus.SENT,
    val replyTo: String? = null,
    val mediaUrl: String? = null,
    val reactions: List<MessageReaction> = emptyList(),
    val isEdited: Boolean = false,
    val isPinned: Boolean = false,
    val isStarred: Boolean = false,
    val isDeleted: Boolean = false
)

data class MessageReaction(
    val emoji: String,
    val userId: String,
    val createdAt: Long
)

enum class MessageType { TEXT, IMAGE, VIDEO, AUDIO, FILE, LOCATION, CONTACT, STICKER }
enum class MessageStatus { SENDING, SENT, DELIVERED, READ, FAILED }

data class SendMessageRequest(
    val conversationId: String,
    val content: String,
    val type: MessageType = MessageType.TEXT,
    val replyTo: String? = null,
    val mediaUrl: String? = null,
    val forwardedFrom: String? = null
)

data class EditMessageRequest(val content: String)

data class ReactionRequest(val emoji: String) // Supported: ❤️, 👍, 😂, 😮, 😢, 🙏

// ==================== CHAT MODELS ====================
data class Chat(
    val id: String,
    val participants: List<String>,
    val lastMessage: Message?,
    val unreadCount: Int = 0,
    val updatedAt: Long,
    val isGroup: Boolean = false,
    val groupName: String? = null,
    val groupIconUrl: String? = null
)

data class CreateChatRequest(
    val participants: List<String>,
    val isGroup: Boolean = false,
    val groupName: String? = null
)

data class ParticipantRequest(val userId: String)

// ==================== CALL MODELS ====================
data class CallData(
    val id: String,
    val callerId: String,
    val receiverId: String,
    val type: CallType,
    val status: CallStatus,
    val startTime: Long? = null,
    val endTime: Long? = null,
    val duration: Int? = null,
    val callerName: String? = null,
    val callerAvatar: String? = null
)

enum class CallType { AUDIO, VIDEO }
enum class CallStatus { INITIATING, RINGING, ACTIVE, ENDED, MISSED, REJECTED }

data class InitiateCallRequest(
    val receiverId: String,
    val type: CallType
)

// ==================== CONTACT MODELS ====================
data class Contact(
    val id: String,
    val userId: String,
    val contactUserId: String?,
    val contactName: String,
    val contactPhone: String?,
    val isRegistered: Boolean = false
)

data class ContactInfo(
    val name: String,
    val phoneNumber: String?,
    val email: String?
)

data class BlockContactRequest(
    val userId: String,
    val reason: String? = null
)

// ==================== PRIVACY MODELS ====================
data class PrivacySettings(
    val lastSeen: VisibilityOption = VisibilityOption.EVERYONE,
    val profilePhoto: VisibilityOption = VisibilityOption.EVERYONE,
    val about: VisibilityOption = VisibilityOption.EVERYONE,
    val readReceipts: Boolean = true,
    val groupsAdd: VisibilityOption = VisibilityOption.EVERYONE
)

enum class VisibilityOption { EVERYONE, CONTACTS, NOBODY }

data class UpdatePrivacyRequest(
    val lastSeen: VisibilityOption?,
    val profilePhoto: VisibilityOption?,
    val about: VisibilityOption?,
    val readReceipts: Boolean?,
    val groupsAdd: VisibilityOption?
)

data class BlockedContact(
    val id: String,
    val blockedUserId: String,
    val blockedUser: User?,
    val reason: String?,
    val blockedAt: Long
)
data class DeviceRegistrationRequest(
    val userId: String,
    val fcmToken: String,
    val platform: String = "android"
)

// ==================== NOTIFICATION MODELS ====================
data class Notification(
    val id: String,
    val userId: String,
    val title: String,
    val message: String,
    val type: String,
    val data: Map<String, Any>?,
    val read: Boolean = false,
    val createdAt: Long
)

data class MarkReadRequest(val notificationIds: List<String>)

// ==================== STORY MODELS ====================
data class Story(
    val id: String,
    val userId: String,
    val mediaUrl: String,
    val caption: String?,
    val type: String,
    val viewCount: Int = 0,
    val createdAt: Long,
    val expiresAt: Long
)

data class CreateStoryRequest(
    val mediaUrl: String,
    val caption: String?,
    val type: String
)

// ==================== COMMUNITY MODELS ====================
data class Community(
    val id: String,
    val name: String,
    val description: String?,
    val iconUrl: String?,
    val memberCount: Int = 0,
    val createdBy: String,
    val createdAt: Long
)

data class CreateCommunityRequest(
    val name: String,
    val description: String?
)

// ==================== SEARCH MODELS ====================
data class UniversalSearchRequest(
    val query: String,
    val lat: Double? = null,
    val lon: Double? = null,
    val category: String? = null,
    val limit: Int = 20
)

data class SearchResponse(
    val results: List<SearchResult>,
    val aiAnswer: String?,
    val totalResults: Int
)

data class SearchResult(
    val id: String,
    val title: String,
    val description: String?,
    val url: String?,
    val imageUrl: String?,
    val rating: Double? = null,
    val distance: String? = null,
    val price: String? = null,
    val category: String? = null,
    val source: String? = null
)

data class AISearchRequest(
    val query: String,
    val context: String? = null
)

data class AISearchResponse(
    val answer: String,
    val sources: List<SearchSource>,
    val relatedQueries: List<String>
)

data class SearchSource(
    val title: String,
    val url: String,
    val snippet: String
)

data class VisualSearchRequest(
    val imageUrl: String? = null,
    val imageBase64: String? = null,
    val userId: String? = null
)

data class VisualSearchResponse(
    val imageAnalysis: ImageAnalysis,
    val results: List<SearchResult>,
    val aiRecommendations: String?
)

data class ImageAnalysis(
    val objects: List<String>,
    val searchQuery: String
)

data class GeoSearchRequest(
    val query: String,
    val lat: Double,
    val lon: Double,
    val radius: Int = 5000,
    val category: String? = null
)

data class PerplexitySearchRequest(val query: String)

data class PerplexityResponse(
    val answer: String,
    val citations: List<String>,
    val sources: List<SearchSource>
)

data class ClickLogRequest(
    val query: String,
    val url: String,
    val position: Int
)

data class JobSearchRequest(
    val query: String,
    val lat: Double? = null,
    val lon: Double? = null,
    val location: String? = null
)

data class JobSearchResponse(
    val jobs: List<Job>,
    val totalResults: Int
)

data class Job(
    val id: String,
    val title: String,
    val company: String,
    val location: String,
    val salary: String?,
    val description: String?,
    val url: String?,
    val postedAt: Long?
)

data class HealthcareSearchRequest(
    val query: String,
    val lat: Double,
    val lon: Double
)

data class HealthcareResponse(
    val providers: List<HealthcareProvider>,
    val totalResults: Int
)

data class HealthcareProvider(
    val id: String,
    val name: String,
    val type: String,
    val address: String,
    val phone: String?,
    val rating: Double?,
    val distance: String?,
    val isOpen: Boolean?
)

// ==================== AI MODELS ====================
data class AIAssistantRequest(
    val message: String,
    val context: String? = null
)

data class AIAssistantResponse(
    val response: String,
    val suggestions: List<String>?
)

data class AIAgentChatRequest(
    val agentId: String,
    val message: String
)

data class AIAgentChatResponse(
    val response: String,
    val agentName: String
)

data class AIAnswerRequest(
    val query: String,
    val context: String? = null
)

data class AIAnswerResponse(
    val answer: String,
    val sources: List<SearchSource>?
)

data class AIHealthRequest(
    val symptoms: String,
    val history: String? = null
)

data class AIHealthResponse(
    val analysis: String,
    val recommendations: List<String>,
    val urgencyLevel: String
)

data class SmartReplyRequest(
    val conversationContext: String
)

data class SmartReplyResponse(
    val replies: List<String>
)

data class SmartComposeRequest(
    val partialText: String,
    val context: String? = null
)

data class SmartComposeResponse(
    val completions: List<String>
)

data class SymptomCheckerRequest(
    val symptoms: List<String>
)

data class SymptomCheckerResponse(
    val possibleConditions: List<PossibleCondition>,
    val recommendations: String,
    val urgencyLevel: String
)

data class PossibleCondition(
    val name: String,
    val probability: Double,
    val description: String
)

data class SummarizeChatRequest(
    val conversationId: String
)

data class SummarizeChatResponse(
    val summary: String,
    val keyPoints: List<String>
)

data class TranslateRequest(
    val text: String,
    val targetLang: String
)

data class TranslateResponse(
    val translatedText: String,
    val detectedLanguage: String?
)

data class TranscribeRequest(
    val audioUrl: String
)

data class TranscribeResponse(
    val text: String,
    val duration: Float?
)

data class ImageGeneratorRequest(
    val prompt: String
)

data class ImageGeneratorResponse(
    val imageUrl: String
)
```

### 6.5 Repository Classes

```kotlin
package com.chatr.app.data.repository

import com.chatr.app.data.api.*
import com.chatr.app.data.models.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val api: ChatrApi
) {
    suspend fun signUp(request: SignUpRequest): Result<AuthResponse> = safeApiCall { api.signUp(request) }
    suspend fun signIn(request: SignInRequest): Result<AuthResponse> = safeApiCall { api.signIn(request) }
    suspend fun signOut(): Result<Unit> = safeApiCall { api.signOut() }
    suspend fun sendOtp(phone: String): Result<Unit> = safeApiCall { api.sendOtp(OtpRequest(phone)) }
    suspend fun verifyOtp(phone: String, otp: String): Result<AuthResponse> = 
        safeApiCall { api.verifyOtp(OtpVerifyRequest(phone, otp)) }
    suspend fun getCurrentUser(): Result<User> = safeApiCall { api.getCurrentUser() }
}

@Singleton
class ChatRepository @Inject constructor(
    private val api: ChatrApi
) {
    fun getChats(userId: String): Flow<Result<List<Chat>>> = flow {
        emit(safeApiCall { api.getChats(userId) })
    }
    
    fun getMessages(chatId: String, limit: Int = 50): Flow<Result<List<Message>>> = flow {
        emit(safeApiCall { api.getMessages(chatId, limit) })
    }
    
    suspend fun sendMessage(request: SendMessageRequest): Result<Message> = 
        safeApiCall { api.sendMessage(request) }
    
    suspend fun createChat(participants: List<String>): Result<Chat> =
        safeApiCall { api.createChat(CreateChatRequest(participants)) }
}

@Singleton
class CallRepository @Inject constructor(
    private val api: ChatrApi
) {
    suspend fun initiateCall(receiverId: String, type: CallType): Result<CallData> =
        safeApiCall { api.initiateCall(InitiateCallRequest(receiverId, type)) }
    
    suspend fun acceptCall(callId: String): Result<CallData> = safeApiCall { api.acceptCall(callId) }
    suspend fun rejectCall(callId: String): Result<CallData> = safeApiCall { api.rejectCall(callId) }
    suspend fun endCall(callId: String): Result<CallData> = safeApiCall { api.endCall(callId) }
    
    fun getCallHistory(): Flow<Result<List<CallData>>> = flow {
        emit(safeApiCall { api.getCallHistory() })
    }
}

@Singleton
class SearchRepository @Inject constructor(
    private val api: SearchApi
) {
    suspend fun universalSearch(query: String, lat: Double?, lon: Double?, category: String? = null): Result<SearchResponse> =
        safeApiCall { api.universalSearch(UniversalSearchRequest(query, lat, lon, category)) }
    
    suspend fun aiBrowserSearch(query: String): Result<AISearchResponse> =
        safeApiCall { api.aiBrowserSearch(AISearchRequest(query)) }
    
    suspend fun visualSearch(imageUrl: String?, imageBase64: String?): Result<VisualSearchResponse> =
        safeApiCall { api.visualSearch(VisualSearchRequest(imageUrl, imageBase64)) }
    
    suspend fun geoSearch(query: String, lat: Double, lon: Double, radius: Int = 5000): Result<SearchResponse> =
        safeApiCall { api.geoSearch(GeoSearchRequest(query, lat, lon, radius)) }
    
    suspend fun fetchJobs(query: String, lat: Double?, lon: Double?): Result<JobSearchResponse> =
        safeApiCall { api.fetchJobs(JobSearchRequest(query, lat, lon)) }
    
    suspend fun fetchHealthcare(query: String, lat: Double, lon: Double): Result<HealthcareResponse> =
        safeApiCall { api.fetchHealthcare(HealthcareSearchRequest(query, lat, lon)) }
    
    suspend fun logClick(query: String, url: String, position: Int): Result<Unit> =
        safeApiCall { api.logClick(ClickLogRequest(query, url, position)) }
}

@Singleton
class AIRepository @Inject constructor(
    private val api: AIApi
) {
    suspend fun aiAssistant(message: String): Result<AIAssistantResponse> =
        safeApiCall { api.aiAssistant(AIAssistantRequest(message)) }
    
    suspend fun aiAgentChat(agentId: String, message: String): Result<AIAgentChatResponse> =
        safeApiCall { api.aiAgentChat(AIAgentChatRequest(agentId, message)) }
    
    suspend fun checkSymptoms(symptoms: List<String>): Result<SymptomCheckerResponse> =
        safeApiCall { api.checkSymptoms(SymptomCheckerRequest(symptoms)) }
    
    suspend fun getSmartReplies(context: String): Result<SmartReplyResponse> =
        safeApiCall { api.getSmartReplies(SmartReplyRequest(context)) }
    
    suspend fun translateMessage(text: String, targetLang: String): Result<TranslateResponse> =
        safeApiCall { api.translateMessage(TranslateRequest(text, targetLang)) }
}

// Helper function for safe API calls
private suspend fun <T> safeApiCall(call: suspend () -> retrofit2.Response<T>): Result<T> {
    return try {
        val response = call()
        if (response.isSuccessful && response.body() != null) {
            Result.success(response.body()!!)
        } else {
            Result.failure(Exception("API Error: ${response.code()} - ${response.message()}"))
        }
    } catch (e: Exception) {
        Result.failure(e)
    }
}
```

### 6.6 Dependency Injection (NetworkModule.kt)

```kotlin
package com.chatr.app.di

import com.chatr.app.data.api.*
import com.chatr.app.data.repository.*
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Named
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    
    private const val BASE_URL = "https://sbayuqgomlflmxgicplz.supabase.co/functions/v1/"
    private const val REST_BASE_URL = "https://sbayuqgomlflmxgicplz.supabase.co/rest/v1/"
    
    @Provides
    @Singleton
    fun provideLoggingInterceptor(): HttpLoggingInterceptor {
        return HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }
    }
    
    @Provides
    @Singleton
    fun provideOkHttpClient(loggingInterceptor: HttpLoggingInterceptor): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            .addInterceptor { chain ->
                val request = chain.request().newBuilder()
                    .addHeader("apikey", BuildConfig.SUPABASE_ANON_KEY)
                    .addHeader("Content-Type", "application/json")
                    .build()
                chain.proceed(request)
            }
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }
    
    @Provides
    @Singleton
    @Named("functions")
    fun provideFunctionsRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }
    
    @Provides
    @Singleton
    @Named("rest")
    fun provideRestRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl(REST_BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }
    
    @Provides
    @Singleton
    fun provideChatrApi(@Named("functions") retrofit: Retrofit): ChatrApi {
        return retrofit.create(ChatrApi::class.java)
    }
    
    @Provides
    @Singleton
    fun provideSearchApi(@Named("functions") retrofit: Retrofit): SearchApi {
        return retrofit.create(SearchApi::class.java)
    }
    
    @Provides
    @Singleton
    fun provideAIApi(@Named("functions") retrofit: Retrofit): AIApi {
        return retrofit.create(AIApi::class.java)
    }
    
    @Provides
    @Singleton
    fun provideAuthRepository(api: ChatrApi): AuthRepository = AuthRepository(api)
    
    @Provides
    @Singleton
    fun provideChatRepository(api: ChatrApi): ChatRepository = ChatRepository(api)
    
    @Provides
    @Singleton
    fun provideCallRepository(api: ChatrApi): CallRepository = CallRepository(api)
    
    @Provides
    @Singleton
    fun provideSearchRepository(api: SearchApi): SearchRepository = SearchRepository(api)
    
    @Provides
    @Singleton
    fun provideAIRepository(api: AIApi): AIRepository = AIRepository(api)
}
```

---

## 7. Deep Link Map

### 7.1 Deep Link Configuration

```kotlin
// AndroidManifest.xml intent-filter
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="chatr.chat" />
    <data android:scheme="https" android:host="www.chatr.chat" />
    <data android:scheme="chatr" android:host="*" />
</intent-filter>
```

### 7.2 Route Mapping Table

| Web Route | Android Deep Link | Parameters | Example |
|-----------|-------------------|------------|---------|
| `/` | `chatr://home` | - | `chatr://home` |
| `/auth` | `chatr://auth` | - | `chatr://auth` |
| `/chat/:id` | `chatr://chat/{id}` | `conversationId: String` | `chatr://chat/abc123` |
| `/profile/:id` | `chatr://profile/{id}` | `userId: String` | `chatr://profile/user123` |
| `/contacts` | `chatr://contacts` | - | `chatr://contacts` |
| `/call-history` | `chatr://calls` | - | `chatr://calls` |
| `/stories` | `chatr://stories` | - | `chatr://stories` |
| `/communities` | `chatr://communities` | - | `chatr://communities` |
| `/health` | `chatr://health` | - | `chatr://health` |
| `/care` | `chatr://care` | - | `chatr://care` |
| `/local-jobs` | `chatr://jobs` | `query?: String` | `chatr://jobs?q=developer` |
| `/local-healthcare` | `chatr://healthcare` | `lat?, lon?` | `chatr://healthcare?lat=28.5&lon=77.3` |
| `/food-ordering` | `chatr://food` | - | `chatr://food` |
| `/local-deals` | `chatr://deals` | - | `chatr://deals` |
| `/search` | `chatr://search` | `q?: String` | `chatr://search?q=restaurants` |
| `/ai-browser` | `chatr://ai-browser` | `url?: String` | `chatr://ai-browser?url=https://...` |
| `/ai-agents` | `chatr://ai-agents` | - | `chatr://ai-agents` |
| `/ai-agents/chat/:id` | `chatr://ai-agent/{id}` | `agentId: String` | `chatr://ai-agent/agent123` |
| `/ai-assistant` | `chatr://ai-assistant` | - | `chatr://ai-assistant` |
| `/chatr-plus` | `chatr://plus` | - | `chatr://plus` |
| `/chatr-plus/service/:id` | `chatr://service/{id}` | `serviceId: String` | `chatr://service/svc123` |
| `/chatr-plus/category/:slug` | `chatr://category/{slug}` | `slug: String` | `chatr://category/beauty` |
| `/seller/portal` | `chatr://seller` | - | `chatr://seller` |
| `/business` | `chatr://business` | - | `chatr://business` |
| `/settings` | `chatr://settings` | - | `chatr://settings` |
| `/notifications` | `chatr://notifications` | - | `chatr://notifications` |
| `/chatr-points` | `chatr://points` | - | `chatr://points` |
| `/reward-shop` | `chatr://rewards` | - | `chatr://rewards` |
| `/wallet` | `chatr://wallet` | - | `chatr://wallet` |
| `/qr-payment` | `chatr://qr-pay` | `amount?, to?` | `chatr://qr-pay?amount=100&to=user123` |
| `/emergency` | `chatr://emergency` | - | `chatr://emergency` |
| `/fame-cam` | `chatr://fame-cam` | - | `chatr://fame-cam` |
| `/chatr-world` | `chatr://world` | - | `chatr://world` |
| `/native-apps` | `chatr://apps` | - | `chatr://apps` |

### 7.3 Navigation Graph Entry (nav_graph.xml)

```xml
<?xml version="1.0" encoding="utf-8"?>
<navigation xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:id="@+id/nav_graph"
    app:startDestination="@id/homeFragment">

    <fragment
        android:id="@+id/homeFragment"
        android:name="com.chatr.app.ui.home.HomeFragment"
        android:label="Home">
        <deepLink app:uri="chatr://home" />
        <deepLink app:uri="https://chatr.chat" />
    </fragment>

    <fragment
        android:id="@+id/chatFragment"
        android:name="com.chatr.app.ui.chat.ChatFragment"
        android:label="Chat">
        <argument
            android:name="conversationId"
            app:argType="string" />
        <deepLink app:uri="chatr://chat/{conversationId}" />
        <deepLink app:uri="https://chatr.chat/chat/{conversationId}" />
    </fragment>

    <fragment
        android:id="@+id/searchFragment"
        android:name="com.chatr.app.ui.search.SearchFragment"
        android:label="Search">
        <argument
            android:name="query"
            app:argType="string"
            app:nullable="true"
            android:defaultValue="" />
        <deepLink app:uri="chatr://search?q={query}" />
        <deepLink app:uri="https://chatr.chat/search?q={query}" />
    </fragment>

    <fragment
        android:id="@+id/aiAgentChatFragment"
        android:name="com.chatr.app.ui.ai.AIAgentChatFragment"
        android:label="AI Agent">
        <argument
            android:name="agentId"
            app:argType="string" />
        <deepLink app:uri="chatr://ai-agent/{agentId}" />
        <deepLink app:uri="https://chatr.chat/ai-agents/chat/{agentId}" />
    </fragment>

    <fragment
        android:id="@+id/serviceDetailFragment"
        android:name="com.chatr.app.ui.plus.ServiceDetailFragment"
        android:label="Service">
        <argument
            android:name="serviceId"
            app:argType="string" />
        <deepLink app:uri="chatr://service/{serviceId}" />
        <deepLink app:uri="https://chatr.chat/chatr-plus/service/{serviceId}" />
    </fragment>

    <!-- Add remaining fragments... -->
</navigation>
```

---

## 8. Integration Checklist

### ✅ Phase 1: Core Setup

- [ ] **Retrofit Setup**
  - [ ] Add Retrofit dependencies to `build.gradle`
  - [ ] Create `ChatrApi`, `SearchApi`, `AIApi` interfaces
  - [ ] Configure `NetworkModule` with Hilt DI
  - [ ] Add API key interceptor for Supabase auth
  - [ ] Configure SSL pinning for production

- [ ] **Data Models**
  - [ ] Create all request/response data classes
  - [ ] Add Gson annotations for JSON serialization
  - [ ] Create enum classes for status types

- [ ] **Repository Layer**
  - [ ] Implement `AuthRepository`
  - [ ] Implement `ChatRepository`
  - [ ] Implement `CallRepository`
  - [ ] Implement `SearchRepository`
  - [ ] Implement `AIRepository`

### ✅ Phase 2: Authentication

- [ ] **Auth Flow**
  - [ ] Phone OTP authentication
  - [ ] Google OAuth integration
  - [ ] Token storage in EncryptedSharedPreferences
  - [ ] Auto-refresh token logic
  - [ ] Logout and session cleanup

### ✅ Phase 3: Real-time Communication

- [ ] **WebRTC Setup**
  - [ ] Add WebRTC dependency
  - [ ] Implement `WebRTCClient` class
  - [ ] Create `CallSignaling` service
  - [ ] Implement ICE candidate handling
  - [ ] Add TURN/STUN server configuration

- [ ] **Socket.IO Integration**
  - [ ] Add Socket.IO client dependency
  - [ ] Create `SocketService` for real-time messages
  - [ ] Handle connection/reconnection logic
  - [ ] Implement presence updates
  - [ ] Handle typing indicators

### ✅ Phase 4: Search Integration

- [ ] **Universal Search**
  - [ ] Implement search UI with categories
  - [ ] Integrate `universal-search` endpoint
  - [ ] Add location-based search parameters
  - [ ] Display AI-generated answers
  - [ ] Log search clicks for analytics

- [ ] **Visual Search**
  - [ ] Camera/gallery image picker
  - [ ] Image compression before upload
  - [ ] Call `visual-search` endpoint
  - [ ] Display visual search results

### ✅ Phase 5: Contacts & Sync

- [ ] **Contact Sync**
  - [ ] Request contacts permission
  - [ ] Read device contacts
  - [ ] Hash phone numbers for privacy
  - [ ] Sync via `contacts/sync` endpoint
  - [ ] Show registered vs unregistered contacts

### ✅ Phase 6: AI Features

- [ ] **AI Assistant**
  - [ ] Chat interface for AI
  - [ ] Integrate `ai-assistant` endpoint
  - [ ] Handle streaming responses
  - [ ] Display smart reply suggestions

- [ ] **Health AI**
  - [ ] Symptom checker UI
  - [ ] Integrate `symptom-checker` endpoint
  - [ ] Display health recommendations

### ✅ Phase 7: Location Services

- [ ] **Location Manager**
  - [ ] Request location permissions
  - [ ] Implement GPS location fetching
  - [ ] Fallback to IP-based location
  - [ ] Update user location via `update-location`
  - [ ] Geofence monitoring

### ✅ Phase 8: Notifications

- [ ] **FCM Setup**
  - [ ] Configure Firebase project
  - [ ] Register device token on login
  - [ ] Handle notification payloads
  - [ ] Deep link from notifications
  - [ ] Handle call notifications (high priority)

### ✅ Phase 9: Deep Linking

- [ ] **Deep Link Setup**
  - [ ] Configure `AndroidManifest.xml` intent filters
  - [ ] Add App Links verification
  - [ ] Create `DeepLinkHandler` class
  - [ ] Map URLs to navigation destinations
  - [ ] Handle query parameters

### ✅ Phase 10: Offline & Caching

- [ ] **Room Database**
  - [ ] Create database entities for messages, chats, contacts
  - [ ] Implement DAO interfaces
  - [ ] Cache API responses locally
  - [ ] Sync when online

- [ ] **Offline Queue**
  - [ ] Queue messages when offline
  - [ ] Auto-retry on reconnection
  - [ ] Handle media uploads offline

---

## Summary Statistics

| Category | Count |
|----------|-------|
| REST API Endpoints | 70+ |
| WebSocket Channels | 5 |
| Search Endpoints | 8 |
| Frontend Routes | 125+ |
| Deep Link Routes | 50+ |
| Edge Functions | 60+ |
| Data Models | 55+ |
| Retrofit Interfaces | 3 |
| Repositories | 5 |
| Database Functions | 45+ |

---

## Changelog

### v3.0.0 (January 2, 2026)
**Major Android Native Architecture Overhaul:**
- Added dual-protocol signaling (WebSocket + Supabase Realtime) for cross-platform call sync
- New `websocket-signaling` edge function handles native `call:accept` events
- New `native-call-update` edge function (service role) bypasses RLS for background call updates
- FCM v1 migration with OAuth2 authentication for high-priority data-only messages
- Added `ChatrFirebaseService` for native TelecomManager integration
- Added `ChatrConnectionService` for WhatsApp-style background calls
- SecureStore credential sync from WebView localStorage for background operations
- Added `MessageSyncWorker` for offline-first message synchronization
- Room database schema updated with `@ColumnInfo` annotations for camelCase column preservation

**WebRTC & Calling Improvements:**
- Extended ICE connection timeouts (45s mobile, 35s desktop)
- Continuous ICE recovery mode with 5-second restart intervals
- Removed auto-disconnect on connection failures - calls only end on explicit hangup
- REPLICA IDENTITY FULL on `calls` table for reliable Realtime delivery
- TelecomManager uses `tel:` URI schemes (E.164) with `ChatrPlus` branding
- Removed 30-second auto-reject timer on incoming calls

**CHATR Brain AI System:**
- Unified AI router with intent detection and agent selection
- Six specialized agents: Personal, Work, Search, Local Services, Job-Matching, Health
- Shared memory context across agents for cross-domain intelligence
- Action dispatcher for transaction completion (book, order, apply)
- New edge functions: `chatr-brain`, `chatr-games-ai`, `mental-health-assistant`

**New Edge Functions:**
- `websocket-signaling` - Dual-protocol call signaling bridge
- `native-call-update` - Service role call status updates
- `fcm-notify` - FCM v1 OAuth2 push notifications
- `chatr-brain` - Unified AI routing
- `chatr-games-ai` - Gaming AI assistant
- `mental-health-assistant` - Mental health support AI

**Android Native Components (android-native/ folder):**
- `ChatrFirebaseService` - FCM message handling with TelecomManager
- `ChatrConnectionService` - Background call management
- `SupabaseRpcRepository` - JWT-aware RPC calls via Retrofit
- `MessageRepository` - Offline-first message management
- `MessageSyncWorker` - Background sync worker
- `SecureStore` - Encrypted credential storage
- Room entities with proper column annotations

### v2.1.0 (December 21, 2025)
- Added JWT-aware RPC functions (`get_user_conversations`, `get_conversation_messages`)
- Fixed "Unknown" user issue with pre-joined profile data
- Added Supabase REST API routing for Android native clients
- Updated Database Schema Reference

### v2.0.0 (December 20, 2025)
- Added message reactions with `toggle_message_reaction` RPC function
- Added privacy settings to profiles (last_seen, profile_photo, about, read_receipts, groups_add)
- Added block/unblock user functionality with blocked_contacts table
- Added typing indicators via Supabase Realtime broadcast
- Added message pinning and starring
- Added message forwarding endpoint
- Added message search endpoint
- Updated Message model with reactions, isEdited, isPinned, isStarred, isDeleted fields
- Added PrivacySettings and BlockedContact models
- Added VisibilityOption enum (EVERYONE, CONTACTS, NOBODY)
- Updated supported reaction emojis: ❤️, 👍, 😂, 😮, 😢, 🙏

### v1.0.0 (December 3, 2025)
- Initial documentation release
- Core API endpoints for auth, users, messages, chats, calls, contacts
- WebSocket and Socket.IO documentation
- Search engine routes (universal, visual, AI browser, geo)
- Frontend pages documentation (120+ routes)
- Android Retrofit interfaces and data models
- Deep link configuration and route mapping
- Integration checklist

---

## 9. WebRTC & Calling Architecture

### 9.1 Production Standards (ChatrPlus Quality)

```
Video: VP9 codec @ 8Mbps/60fps (FaceTime-standard)
Audio: Opus @ 128kbps with noise suppression
Adaptive Bitrate: Auto-adjusts based on network conditions
ICE Timeout: 45s mobile, 35s desktop
Recovery: Continuous ICE restarts every 5s if disconnected
```

### 9.2 Dual-Protocol Signaling

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Native Android │     │  Edge Function   │     │  Web/PWA App    │
│  (WebSocket)    │────▶│ websocket-       │────▶│ (Realtime)      │
│  call:accept    │     │ signaling        │     │ status: active  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                              │
                              ▼
                        ┌──────────────────┐
                        │  Database        │
                        │  calls.status    │
                        │  webrtc_signals  │
                        └──────────────────┘
```

### 9.3 FCM v1 Call Notifications

```json
{
  "message": {
    "token": "<device_token>",
    "android": {
      "priority": "high",
      "data": {
        "type": "incoming_call",
        "callId": "uuid",
        "callerName": "John Doe",
        "callerPhone": "+1234567890",
        "isVideo": "true"
      }
    }
  }
}
```

### 9.4 Native TelecomManager Integration

```kotlin
// URI scheme for system call UI
val uri = Uri.parse("tel:+1234567890")
val extras = Bundle().apply {
    putString(TelecomManager.EXTRA_INCOMING_CALL_EXTRAS, "ChatrPlus")
}
telecomManager.addNewIncomingCall(phoneAccountHandle, extras)
```

---

## 10. CHATR Brain AI System

### 10.1 Unified Router Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CHATR BRAIN (Router)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Intent      │──│ Agent       │──│ Shared Memory Store     │  │
│  │ Detection   │  │ Selection   │  │ (Cross-Agent Context)   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            ▼
    ┌───────────┬───────────┬───────────┬───────────┬───────────┐
    │ Personal  │ Work AI   │ Search AI │ Local     │ Health AI │
    │ AI        │           │           │ Services  │           │
    │ (habits)  │ (tasks)   │ (answers) │ (booking) │ (symptoms)│
    └───────────┴───────────┴───────────┴───────────┴───────────┘
```

### 10.2 Specialized Agents

| Agent | Purpose | Actions |
|-------|---------|---------|
| Personal AI | Learns habits, tone, preferences | Reminders, personalization |
| Work AI | Tasks, docs, meetings | Summarize, schedule, organize |
| Search AI | Perplexity-style answers | Web search with citations |
| Local Services | Plumbers, food, groceries, doctors | Book, order, schedule |
| Job-Matching AI | Resume to job application | Apply, match, prepare |
| Health AI | Symptoms, doctor search | Check symptoms, find doctors |

### 10.3 Cross-Agent Intelligence

```typescript
// Shared context enables features like:
// - Health AI knowing user location from Local Services AI
// - Work AI knowing meetings for Personal AI reminders
// - Job AI knowing skills for Search AI career advice

interface SharedContext {
  userId: string;
  location?: { lat: number; lon: number };
  recentSearches: string[];
  healthProfile?: HealthData;
  workContext?: WorkData;
  preferences: UserPreferences;
}
```

---

## Summary Statistics

| Category | Count |
|----------|-------|
| REST API Endpoints | 85+ |
| WebSocket Channels | 6 |
| Search Endpoints | 10 |
| Frontend Routes | 130+ |
| Deep Link Routes | 55+ |
| Edge Functions | 85+ |
| Data Models | 60+ |
| Retrofit Interfaces | 4 |
| Repositories | 8 |
| Database Functions | 65+ |
| AI Agents | 6 |
| Native Android Components | 15+ |

---

**Document Version**: 3.0.0  
**Generated**: 2026-01-02  
**Domain**: chatr.chat
