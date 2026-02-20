# CHATR Complete API & Route Documentation

> Auto-generated comprehensive documentation for chatr.chat domain
> Last Updated: 2026-02-20
> Version: 4.0.0

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
12. [Database Triggers & Automation](#11-database-triggers--automation)

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

### 0.3 Other RPC Functions

| Function | Body | Description |
|----------|------|-------------|
| `create_direct_conversation` | `{ "other_user_id": "uuid" }` | Create 1-to-1 conversation (finds existing or creates new) |
| `toggle_message_reaction` | `{ "p_message_id": "uuid", "p_user_id": "uuid", "p_emoji": "❤️" }` | Toggle emoji reaction on message |
| `find_user_for_call` | `{ "search_term": "phone_or_email" }` | Find user by phone/email/ID for calling |
| `get_user_conversations_optimized` | `{ "p_user_id": "uuid" }` | Performance-optimized conversation list (LIMIT 50) |
| `sync_user_contacts` | `{ "user_uuid": "uuid", "contact_list": [...] }` | Sync phone contacts and match registered users |
| `add_call_participant` | `{ "p_call_id": "uuid", "p_user_id": "uuid" }` | Add participant to group call |
| `get_call_participants` | `{ "p_call_id": "uuid" }` | List active call participants |
| `process_coin_payment` | `{ "p_user_id": "uuid", "p_amount": 100, ... }` | Process Chatr Coin payment |
| `process_referral_reward` | `{ "referral_code_param": "ABC123" }` | Process referral code and reward points |
| `generate_user_referral_code` | `{}` | Generate unique referral code for current user |
| `calculate_bmi` | `{ "p_height_cm": 170, "p_weight_kg": 70 }` | Calculate BMI with category |
| `track_app_usage` | `{ "p_app_id": "uuid" }` | Track mini-app usage count |
| `increment_community_members` | `{ "community_id": "uuid" }` | Increment community member count |
| `check_api_limit` | `{ "api": "search", "daily_max": 10000 }` | Rate limiting check |
| `increment_job_views` | `{ "job_id": "uuid" }` | Increment job listing view counter |
| `find_emotion_matches` | `{ "p_user_id": "uuid", "p_emotion": "happy" }` | Find users with matching emotions for connection |
| `haversine_distance_km` | `{ lat1, lng1, lat2, lng2 }` | Calculate distance between two GPS coordinates |
| `is_conversation_participant` | `{ "_conversation_id": "uuid", "_user_id": "uuid" }` | Check if user is in conversation |
| `generate_sso_token` | `{ "app_id_param": "uuid" }` | Generate SSO token for mini-app auth |
| `create_mutual_contact` | `{ "user1_email": "...", "user2_email": "..." }` | Create bidirectional contact entries |

### 0.4 Database Schema Reference

```
conversations
├── id (UUID, PK)
├── is_group (BOOLEAN)
├── is_community (BOOLEAN)
├── group_name (TEXT)
├── group_icon_url (TEXT)
├── community_description (TEXT)
├── member_count (INTEGER)
├── disappearing_messages_duration (INTEGER, seconds)
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
├── media_url (TEXT)
├── media_attachments (JSONB)
├── reply_to (UUID, self-FK)
├── is_edited (BOOLEAN)
├── is_deleted (BOOLEAN)
├── is_starred (BOOLEAN)
├── is_pinned (BOOLEAN)
├── is_expired (BOOLEAN)
├── expires_at (TIMESTAMPTZ)
├── location_latitude (NUMERIC)
├── location_longitude (NUMERIC)
├── location_name (TEXT)
└── created_at (TIMESTAMPTZ)

profiles
├── id (UUID, PK = auth.users.id)
├── username (TEXT)
├── avatar_url (TEXT)
├── is_online (BOOLEAN)
├── email (TEXT)
├── phone_number (TEXT)
├── phone_search (TEXT, normalized)
├── phone_hash (TEXT)
├── bio (TEXT)
├── onboarding_completed (BOOLEAN)
├── last_seen (TIMESTAMPTZ)
├── privacy_last_seen (TEXT)
├── privacy_profile_photo (TEXT)
├── privacy_about (TEXT)
├── read_receipts_enabled (BOOLEAN)
├── privacy_groups_add (TEXT)
└── updated_at (TIMESTAMPTZ)

calls
├── id (UUID, PK)
├── conversation_id (UUID, FK)
├── caller_id (UUID)
├── receiver_id (UUID, FK → profiles)
├── call_type (TEXT: 'audio'|'video')
├── status (TEXT: 'ringing'|'active'|'ended'|'missed'|'rejected')
├── caller_name (TEXT)
├── caller_avatar (TEXT)
├── caller_phone (TEXT)
├── receiver_name (TEXT)
├── receiver_avatar (TEXT)
├── receiver_phone (TEXT)
├── duration (INTEGER, seconds)
├── started_at (TIMESTAMPTZ)
├── ended_at (TIMESTAMPTZ)
├── missed (BOOLEAN)
├── is_group (BOOLEAN)
├── total_participants (INTEGER)
├── webrtc_state (TEXT)
├── connection_quality (TEXT)
├── quality_rating (INTEGER)
├── quality_metrics (JSONB)
├── average_bitrate (INTEGER)
├── packet_loss_percentage (NUMERIC)
├── reconnection_count (INTEGER)
├── participants (JSONB)
└── created_at (TIMESTAMPTZ)

webrtc_signals
├── id (UUID, PK)
├── call_id (UUID)
├── from_user (UUID)
├── to_user (UUID)
├── type (TEXT: 'offer'|'answer'|'candidate')
├── data (JSONB)
└── created_at (TIMESTAMPTZ)
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
| POST | `auth-phone-otp` | Phone OTP (send/verify) | No | `{ phoneNumber, action: "send"|"verify", otp? }` |
| POST | `firebase-phone-auth` | Firebase phone auth | No | `{ phoneNumber, firebaseUid }` |
| GET | `/auth/user` | Get current user | Yes | - |
| POST | `qr-login` | QR code login | No | `{ session_id, token }` |

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
| POST | `schedule-notification` | Schedule notification | Yes | `{ userId, title, body, scheduledFor }` |
| POST | `process-scheduled-notifications` | Process scheduled queue | Yes | - |
| POST | `send-module-notification` | Module-specific notification | Yes | `{ userId, module, title, body }` |

### 1.9 Search Service

| Method | Endpoint | Description | Auth | Request/Response |
|--------|----------|-------------|------|------------------|
| POST | `universal-search` | Universal search | No | `{ query, lat?, lon?, category? }` |
| POST | `universal-search-engine` | Full search engine | No | `{ query, filters?, pagination? }` |
| POST | `ai-browser-search` | AI-powered search | Yes | `{ query, context? }` |
| POST | `visual-search` | Image-based search | No | `{ imageUrl?, imageBase64? }` |
| POST | `geo-search` | Location search | No | `{ query, lat, lon, radius? }` |
| POST | `perplexity-search` | Deep web search | No | `{ query }` |
| POST | `web-search-aggregator` | Multi-source aggregation | No | `{ query, sources? }` |
| POST | `click-log` | Log search clicks | No | `{ query, url, position }` |
| POST | `search-suggestions` | Get search suggestions | No | `{ query, category? }` |
| POST | `saved-search-alerts` | Manage saved search alerts | Yes | `{ query, frequency }` |
| POST | `search-alerts-notifier` | Trigger saved search alerts | Yes | - |
| POST | `chatr-world-search` | Chatr World content search | Yes | `{ query }` |

### 1.10 AI Services

| Method | Endpoint | Description | Auth | Request/Response |
|--------|----------|-------------|------|------------------|
| POST | `ai-assistant` | AI assistant chat | No | `{ message, context? }` |
| POST | `ai-chat-assistant` | Conversational AI chat | Yes | `{ message, history? }` |
| POST | `ai-agent-chat` | AI agent conversation | Yes | `{ agent_id, message }` |
| POST | `ai-answer` | Get AI answer | No | `{ query, context? }` |
| POST | `ai-health-assistant` | Health AI | No | `{ symptoms, history? }` |
| POST | `ai-smart-reply` | Smart reply suggestions | No | `{ conversation_context }` |
| POST | `smart-compose` | AI compose | Yes | `{ partial_text, context }` |
| POST | `symptom-checker` | Symptom analysis | Yes | `{ symptoms: string[] }` |
| POST | `summarize-chat` | Chat summary | Yes | `{ conversation_id }` |
| POST | `ai-chat-summary` | AI-powered chat summary | Yes | `{ conversationId }` |
| POST | `translate-message` | Translate text | Yes | `{ text, target_lang }` |
| POST | `auto-translate` | Auto-detect & translate | Yes | `{ text }` |
| POST | `transcribe-voice` | Voice to text | Yes | `{ audio_url }` |
| POST | `ai-image-generator` | Generate AI image | Yes | `{ prompt }` |
| POST | `ai-message-insights` | Message analytics insights | Yes | `{ conversationId }` |
| POST | `ai-coaching` | AI life coaching | Yes | `{ message, context }` |
| POST | `ai-voice-summarize` | Voice message summary | Yes | `{ audioUrl }` |
| POST | `agent-voice-tts` | Text-to-speech for agents | Yes | `{ text, voice? }` |
| POST | `generate-sticker` | AI sticker generation | Yes | `{ photoUrl, style }` |
| POST | `generate-feature` | AI feature generation | Yes | `{ description }` |
| POST | `analyze-fame-content` | Analyze content virality | Yes | `{ contentUrl }` |
| POST | `analyze-chat-brands` | Brand detection in chat | Yes | `{ conversationId }` |
| POST | `world-content-moderation` | Content moderation | Yes | `{ contentId, type }` |

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
| POST | `health-bmi-calculator` | BMI calculation | Yes | `{ height_cm, weight_kg }` |
| POST | `health-passport-export` | Export health passport | Yes | `{ format: "pdf"|"json" }` |
| POST | `nutrition-tracker` | Log nutrition data | Yes | `{ meals, water_ml }` |
| POST | `parse-prescription` | OCR prescription parsing | Yes | `{ imageUrl }` |
| POST | `live-transcription` | Real-time speech transcription | Yes | `{ audioChunk }` |

### 1.14 Jobs Services

| Method | Endpoint | Description | Auth | Request/Response |
|--------|----------|-------------|------|------------------|
| POST | `fetch-jobs` | Search jobs | No | `{ query, lat?, lon?, location? }` |
| POST | `scrape-jobs` | Scrape job listings | No | `{ query, location }` |
| POST | `crawl-jobs` | Crawl job boards | No | `{ sources, query }` |
| POST | `job-matching` | AI job matching | Yes | `{ user_profile }` |

### 1.15 Payment Services

| Method | Endpoint | Description | Auth | Request/Response |
|--------|----------|-------------|------|------------------|
| POST | `qr-payment` | QR payment | Yes | `{ amount, recipient_id }` |
| POST | `process-referral` | Process referral | Yes | `{ referral_code }` |
| POST | `generate-referral-code` | Generate code | Yes | - |
| POST | `process-coin-reward` | Reward coins | Yes | `{ action_type }` |
| POST | `process-daily-login` | Daily login reward | Yes | - |
| POST | `process-daily-login-streak` | Streak-based login rewards | Yes | - |
| POST | `notify-referral-join` | Notify referrer on join | Yes | `{ referrerId, newUserId }` |

### 1.16 WebRTC Services

| Method | Endpoint | Description | Auth | Request/Response |
|--------|----------|-------------|------|------------------|
| POST | `webrtc-signaling` | WebRTC signaling | No | `{ type, sdp?, candidate? }` |
| POST | `websocket-signaling` | Dual-protocol signaling | Yes | `{ type, callId, data }` |
| POST | `get-turn-credentials` | Get TURN credentials | Yes | Response: `{ urls, username, credential }` |
| POST | `realtime-token` | Get realtime token | Yes | Response: `{ token }` |
| POST | `native-call-update` | Native call status update (service role) | Yes | `{ callId, status, userId }` |
| POST | `pstn-call` | PSTN phone call bridge | Yes | `{ phoneNumber, callId }` |
| POST | `call-summary` | Generate call summary | Yes | `{ callId }` |
| POST | `call-sentiment` | Analyze call sentiment | Yes | `{ callId }` |
| POST | `live-translate` | Real-time call translation | Yes | `{ text, sourceLang, targetLang }` |

### 1.17 FCM & Push Services

| Method | Endpoint | Description | Auth | Request/Response |
|--------|----------|-------------|------|------------------|
| POST | `fcm-notify` | Send FCM v1 push (OAuth2) | Yes | `{ userId, title, body, data }` |
| POST | `fcm-call-trigger` | DB-trigger initiated call notification | Internal | `{ call_id, caller_id, receiver_id, ... }` |
| POST | `send-call-notification` | High-priority call notification | Yes | `{ callId, callerName, isVideo }` |
| POST | `send-chat-notification` | Chat message notification | Yes | `{ conversationId, message }` |
| POST | `send-push-notification` | Generic push notification | Yes | `{ userId, title, body }` |
| POST | `send-push` | Simplified push endpoint | Yes | `{ to, title, body }` |
| POST | `register-device-token` | Register FCM token | Yes | `{ token, platform }` |
| POST | `send-sms` | Send SMS notification | Yes | `{ phoneNumber, message }` |
| POST | `send-broadcast-email` | Broadcast email to users | Yes | `{ subject, body, recipients }` |

### 1.18 CHATR Brain AI Services

| Method | Endpoint | Description | Auth | Request/Response |
|--------|----------|-------------|------|------------------|
| POST | `chatr-brain` | Unified AI router | Yes | `{ message, context?, agentHint? }` |
| POST | `chatr-world-ai` | Social feed AI | Yes | `{ query, context }` |
| POST | `chatr-world` | Chatr World content engine | Yes | `{ action, data }` |
| POST | `chatr-games-ai` | Gaming AI assistant | Yes | `{ gameContext, action }` |
| POST | `universal-ai-search` | Universal AI search | Yes | `{ query, category? }` |
| POST | `mental-health-assistant` | Mental health AI | Yes | `{ message, history? }` |
| POST | `chatr-plus-ai-search` | Chatr+ service AI search | Yes | `{ query, location? }` |

### 1.19 Chatr+ Marketplace Services

| Method | Endpoint | Description | Auth | Request/Response |
|--------|----------|-------------|------|------------------|
| POST | `detect-video-objects` | Object detection in video calls | Yes | `{ frameData }` |

### 1.20 Communication Services

| Method | Endpoint | Description | Auth | Request/Response |
|--------|----------|-------------|------|------------------|
| POST | `send-invite` | Send app invite | Yes | `{ contactPhone, message }` |
| POST | `send-whatsapp-invite` | Send WhatsApp invite | Yes | `{ phoneNumber }` |
| POST | `sync-google-contacts` | Sync Google contacts | Yes | `{ accessToken }` |
| POST | `backfill-phone-hashes` | Backfill phone hashes for privacy | Internal | - |

### 1.21 Micro-Tasks / Earning Services

| Method | Endpoint | Description | Auth | Request/Response |
|--------|----------|-------------|------|------------------|
| POST | `verify-micro-task` | Verify task completion | Yes | `{ taskId, proof }` |

### 1.22 App Management

| Method | Endpoint | Description | Auth | Request/Response |
|--------|----------|-------------|------|------------------|
| POST | `app-version` | Check app version | No | `{ platform, currentVersion }` |
| POST | `cleanup-expired-messages` | Cleanup disappearing messages | Internal | - |

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
  - calls: Call status changes (REPLICA IDENTITY FULL)
  - webrtc_signals: WebRTC signaling relay
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
| `/` | Index | Landing page (SubdomainRedirect) |
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
| `/join` | JoinInvite | Invite join page |
| `/web` | ChatrWeb | Web app entry |
| `/search` | UniversalSearch | Global search |
| `/universal-search` | UniversalSearch | Alias for search |
| `/ai-browser-home` | AIBrowserHome | AI Browser landing |
| `/ai-search` | AIBrowserHome | AI Search alias |
| `/ai-browser` | AIBrowserView | AI Browser results |
| `/chatr-home` | ChatrHome | Search home |
| `/chatr-results` | ChatrResults | Search results |

### 4.2 Desktop Layout Routes (web.chatr.chat)

| Route | Page | Description |
|-------|------|-------------|
| `/desktop` | DesktopLayout | Desktop wrapper (redirects to /desktop/chat) |
| `/desktop/chat` | DesktopChat | Desktop chat view |
| `/desktop/contacts` | DesktopContacts | Desktop contacts |
| `/desktop/calls` | DesktopCalls | Desktop calls |
| `/desktop/notifications` | Notifications | Desktop notifications |
| `/desktop/settings` | Settings | Desktop settings |

### 4.3 Core Chat Routes

| Route | Page | Description |
|-------|------|-------------|
| `/home` | Home | Main home page |
| `/chat` | Chat | Chat list |
| `/chat/:conversationId` | Chat | Chat conversation |
| `/chat/:conversationId/media` | MediaViewer | Media gallery |
| `/contacts` | Contacts | Contacts list |
| `/global-contacts` | GlobalContacts | Global directory |
| `/call-history` | CallHistory | Call log |
| `/calls` | Calls | Calls page |
| `/smart-inbox` | SmartInbox | AI-sorted inbox |
| `/starred-messages` | StarredMessages | Starred messages |
| `/stories` | Stories | Stories feed |

### 4.4 Health & Wellness Routes

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
| `/medication-interactions` | MedicationInteractionsPage | Drug interaction check |
| `/health-streaks` | HealthStreaksPage | Health adherence streaks |
| `/chronic-vitals` | ChronicVitalsPage | Chronic condition vitals |
| `/bmi-calculator` | BMICalculator | BMI calculator |
| `/nutrition-tracker` | NutritionTracker | Nutrition logging |
| `/mental-health` | MentalHealth | Mental health support |
| `/health-reminders` | HealthReminders | Health reminders |
| `/health-risks` | HealthRiskPredictions | AI risk predictions |
| `/emergency` | EmergencyButton | Emergency SOS |
| `/emergency-services` | EmergencyServices | Emergency directory |
| `/local-healthcare` | LocalHealthcare | Nearby healthcare |

### 4.4.1 Care Path Routes

| Route | Page | Description |
|-------|------|-------------|
| `/care/path/:pathId` | CarePathDetail | Care pathway detail |
| `/care/doctor/:doctorId` | DoctorDetail | Doctor profile |
| `/care/family/add` | AddFamilyMember | Add family member |
| `/care/appointments` | MyAppointments | User appointments |

### 4.4.2 Medicine Subscription Routes

| Route | Page | Description |
|-------|------|-------------|
| `/care/medicines` | MedicineHubPage | Medicine hub |
| `/care/medicines/subscribe` | MedicineSubscribePage | Medicine subscription |
| `/care/medicines/subscriptions` | MedicineSubscriptionsPage | Active subscriptions |
| `/care/medicines/family` | MedicineFamilyPage | Family medicine |
| `/care/medicines/vitals` | MedicineVitalsPage | Vitals tracking |
| `/care/medicines/prescriptions` | MedicinePrescriptionsPage | Prescriptions |
| `/care/medicines/reminders` | MedicineRemindersPage | Medicine reminders |
| `/care/medicines/rewards` | MedicineRewardsPage | Adherence rewards |

### 4.5 Discovery & Search Routes

| Route | Page | Description |
|-------|------|-------------|
| `/geo` | GeoDiscovery | Location discovery |
| `/jobs` | LocalJobs | Job search |
| `/local-jobs` | → `/jobs` redirect | Legacy redirect |
| `/job/:id` | JobDetail | Job detail (protected) |
| `/food-ordering` | FoodOrdering | Food delivery |
| `/restaurant/:id` | RestaurantDetail | Restaurant detail |
| `/food-checkout/:id` | FoodCheckout | Food checkout |
| `/order-tracking/:orderId` | OrderTracking | Order tracking |
| `/order-history` | OrderHistory | Order history |
| `/local-deals` | LocalDeals | Local deals |
| `/marketplace` | Marketplace | Marketplace |
| `/marketplace/checkout` | MarketplaceCheckout | Marketplace checkout |
| `/marketplace/order-success` | OrderSuccessPage | Order success |
| `/home-services` | HomeServices | Home services |

### 4.6 AI & Assistant Routes

| Route | Page | Description |
|-------|------|-------------|
| `/ai-agents` | AIAgentsHub | AI agents marketplace |
| `/ai-agents/create` | AIAgentCreate | Create AI agent |
| `/ai-agents/chat/:agentId` | AIAgentChatNew | Chat with AI agent |
| `/ai-agents/settings/:agentId` | AIAgents | AI agent settings |
| `/ai-assistant` | AIAssistant | AI assistant |
| `/prechu-ai` | PrechuAI | Prechu AI chat (protected) |
| `/chat-ai` | AIChat | AI conversation |

### 4.7 Community Routes

| Route | Page | Description |
|-------|------|-------------|
| `/community` | CommunitySpace / Community | Community hub |
| `/communities` | Communities | Community list |
| `/create-community` | CreateCommunity | Create community |
| `/wellness-circles` | WellnessCircles | Wellness groups |
| `/wellness-circles/:circleId` | WellnessCircles | Specific circle |
| `/chatr-world` | ChatrWorld | Social feed |
| `/chatr-games` | ChatrGames | Games hub |

### 4.8 Chatr+ Marketplace Routes

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
| `/chatr-wallet` | ChatrWallet | Wallet alias |
| `/chatr-plus-subscribe` | ChatrPlusSubscribe | Subscribe alias |

### 4.9 Seller Portal Routes

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
| `/seller/settlements` | SellerSettlements | Settlement history |
| `/chatr-plus/seller-registration` | ChatrPlusSellerRegistration | Seller signup |
| `/chatr-plus/seller/dashboard` | ChatrPlusSellerDashboard | Dashboard |
| `/chatr-plus/seller/bookings` | SellerBookings | Seller bookings alias |
| `/chatr-plus/seller/services` | SellerServices | Seller services alias |
| `/chatr-plus/seller/analytics` | SellerAnalytics | Analytics alias |
| `/chatr-plus/seller/messages` | SellerMessages | Messages alias |
| `/chatr-plus/seller/settings` | SellerSettings | Settings alias |

### 4.10 Vendor Portal Routes (Food/Doctor)

| Route | Page | Description |
|-------|------|-------------|
| `/vendor/login` | VendorLogin | Vendor login |
| `/vendor/register` | VendorRegister | Vendor registration |
| `/vendor/dashboard` | VendorDashboard | Vendor dashboard (protected) |
| `/vendor/menu` | RestaurantMenu | Restaurant menu (protected) |
| `/vendor/orders` | RestaurantOrders | Restaurant orders (protected) |
| `/vendor/deals` | DealsManagement | Deals management (protected) |
| `/vendor/deals/new` | DealsManagement | New deal (protected) |
| `/vendor/settings` | VendorSettings | Vendor settings (protected) |
| `/vendor/appointments` | DoctorAppointments | Doctor appointments (protected) |
| `/vendor/patients` | DoctorPatients | Doctor patients (protected) |
| `/vendor/analytics` | DoctorAnalytics | Doctor analytics (protected) |
| `/vendor/availability` | DoctorAvailability | Doctor availability (protected) |

### 4.11 Business Routes

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
| `/dhandha` | Dhandha | Business portal (Hindi, protected) |

### 4.12 Provider Routes

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
| `/service/:categoryId` | ServiceListing | Service listing |
| `/booking` | BookingPage | Booking page |
| `/booking/track/:bookingId` | BookingTracking | Booking tracking |

### 4.13 Admin Routes (Protected)

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
| `/admin/kyc-approvals` | KYCApprovals | KYC verification approvals |
| `/admin/chatr-world` | ChatrWorldAdmin | Chatr World moderation |
| `/admin/payment-verification` | PaymentVerification | Payment verification |
| `/admin/micro-tasks` | AdminMicroTasks | Micro-tasks management |

### 4.14 User Settings Routes

| Route | Page | Description |
|-------|------|-------------|
| `/profile` | Profile | User profile |
| `/account` | Account | Account settings |
| `/settings` | Settings | App settings |
| `/notifications` | Notifications | Notifications |
| `/notification-settings` | NotificationSettings | Notification prefs |
| `/notifications/settings` | NotificationSettings | Alias |
| `/device-management` | DeviceManagement | Linked devices |
| `/geofences` | Geofences | Geofence settings |
| `/geofence-history` | GeofenceHistory | Geofence log |
| `/stealth-mode` | StealthMode | Stealth mode (protected) |
| `/kyc-verification` | KYCVerificationPage | KYC verification (protected) |
| `/bluetooth-test` | BluetoothTest | Bluetooth testing |

### 4.15 Growth & Rewards Routes

| Route | Page | Description |
|-------|------|-------------|
| `/chatr-points` | ChatrPoints | Points dashboard |
| `/reward-shop` | RewardShop | Rewards store |
| `/growth` | ChatrGrowth | Growth hub |
| `/chatr-growth` | ChatrGrowth | Growth hub alias |
| `/referrals` | Referrals | Referral program (protected) |
| `/ambassador-program` | AmbassadorProgram | Ambassador signup |
| `/leaderboard` | ChatrPoints | Leaderboard |

### 4.16 Special Feature Routes

| Route | Page | Description |
|-------|------|-------------|
| `/native-apps` | MiniApps | App launcher |
| `/mini-apps` | MiniAppsStore | Mini apps store |
| `/chatr-os` | ChatrOS | Chatr OS interface |
| `/os-detection` | OSDetection | OS detection |
| `/launcher` | Launcher | Home launcher (protected) |
| `/chatr-studio` | ChatrStudio | Content studio |
| `/fame-cam` | FameCam | Fame camera (protected) |
| `/fame-leaderboard` | FameLeaderboard | Fame rankings (protected) |
| `/capture` | Capture | Photo/video capture |
| `/qr-payment` | QRPayment | QR payments |

### 4.17 Education Routes

| Route | Page | Description |
|-------|------|-------------|
| `/chatr-tutors` | ChatrTutors | Tutoring |
| `/tutors` | ChatrTutors | Tutors alias |
| `/youth-engagement` | YouthEngagement | Youth hub |
| `/youth-feed` | YouthFeed | Youth content |
| `/expert-sessions` | ExpertSessions | Expert calls |

### 4.18 Developer & Ecosystem Routes

| Route | Page | Description |
|-------|------|-------------|
| `/developer-portal` | DeveloperPortal | Developer hub |
| `/app-statistics` | AppStatistics | App stats |
| `/official-accounts` | OfficialAccounts | Official accounts |

### 4.19 Earning / Micro-Tasks Routes

| Route | Page | Description |
|-------|------|-------------|
| `/earn` | Earn | Micro-tasks earning (protected) |
| `/earn/history` | EarnHistory | Earning history (protected) |

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
| `ContactsRepository` | `data/repository/` | Contact sync, block/unblock |
| `MessageSyncWorker` | `sync/` | Background message synchronization |
| `SecureStore` | `security/` | Encrypted credential storage |
| `SimpleWebRTC` | `webrtc/` | WebRTC connection management |
| `SocketService` | `websocket/` | Real-time WebSocket communication |

### 5.3 Room Database Entities

```kotlin
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
        │                     │ - ContactsRepo   │
        │                     └──────────────────┘
```

---

## 6. Android Retrofit Interfaces

### 6.1 ChatrApi.kt (Complete Interface)

```kotlin
interface ChatrApi {
    
    // ==================== AUTH ====================
    @POST("auth/signup")
    suspend fun signUp(@Body request: SignUpRequest): Response<AuthResponse>
    
    @POST("auth/signin")
    suspend fun signIn(@Body request: SignInRequest): Response<AuthResponse>
    
    @POST("auth/signout")
    suspend fun signOut(): Response<Unit>
    
    @POST("auth-phone-otp")
    suspend fun sendOtp(@Body request: OtpRequest): Response<OtpSendResponse>
    
    @POST("auth-phone-otp")
    suspend fun verifyOtp(@Body request: OtpVerifyRequest): Response<AuthResponse>
    
    @GET("auth/user")
    suspend fun getCurrentUser(): Response<User>
    
    @POST("auth/refresh")
    suspend fun refreshToken(@Body request: RefreshTokenRequest): Response<AuthResponse>
    
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
    
    // ==================== DEVICE ====================
    @POST("device/register")
    suspend fun registerDevice(@Body request: DeviceRegistrationRequest): Response<Unit>
    
    @POST("device/unregister")
    suspend fun unregisterDevice(@Body request: DeviceUnregisterRequest): Response<Unit>
}
```

### 6.2 ContactsApi.kt

```kotlin
interface ContactsApi {
    @GET("contacts")
    suspend fun getContacts(): Response<List<ContactResponse>>
    
    @POST("contacts/sync")
    suspend fun syncContacts(@Body contacts: List<ContactInfo>): Response<List<User>>
    
    @POST("contacts/block")
    suspend fun blockContact(@Body request: BlockContactRequest): Response<Unit>
    
    @DELETE("contacts/block/{userId}")
    suspend fun unblockContact(@Path("userId") userId: String): Response<Unit>
    
    @GET("contacts/blocked")
    suspend fun getBlockedContacts(): Response<List<ContactResponse>>
}
```

### 6.3 SearchApi.kt

```kotlin
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

### 6.4 AIApi.kt

```kotlin
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

### 6.5 Data Models (Models.kt)

```kotlin
// ==================== AUTH MODELS ====================
data class SignUpRequest(val email: String?, val password: String?, val phoneNumber: String?)
data class SignInRequest(val email: String?, val password: String?, val phone: String?, val otp: String?)
data class OtpRequest(val phoneNumber: String, val action: String = "send")
data class OtpSendResponse(val success: Boolean, val message: String?)
data class OtpVerifyRequest(val phoneNumber: String, val otp: String? = null, val firebaseUid: String? = null, val action: String = "verify")
data class RefreshTokenRequest(val refreshToken: String)
data class AuthResponse(val accessToken: String, val refreshToken: String, val user: User, val expiresIn: Long)

// ==================== USER MODELS ====================
data class User(val id: String, val email: String?, val phoneNumber: String?, val username: String?, val avatarUrl: String?, val isOnline: Boolean = false, val lastSeen: Long? = null, val bio: String? = null)
data class UpdateUserRequest(val username: String?, val avatarUrl: String?, val bio: String?)
data class OnlineStatusRequest(val isOnline: Boolean)

// ==================== MESSAGE MODELS ====================
data class Message(val id: String, val conversationId: String, val senderId: String, val content: String, val timestamp: Long, val type: MessageType = MessageType.TEXT, val status: MessageStatus = MessageStatus.SENT, val replyTo: String? = null, val mediaUrl: String? = null, val reactions: List<MessageReaction> = emptyList(), val isEdited: Boolean = false, val isPinned: Boolean = false, val isStarred: Boolean = false, val isDeleted: Boolean = false)
data class MessageReaction(val emoji: String, val userId: String, val createdAt: Long)
enum class MessageType { TEXT, IMAGE, VIDEO, AUDIO, FILE, LOCATION, CONTACT, STICKER }
enum class MessageStatus { SENDING, SENT, DELIVERED, READ, FAILED }
data class SendMessageRequest(val conversationId: String, val content: String, val type: String = "TEXT", val replyTo: String? = null, val mediaUrl: String? = null)
data class EditMessageRequest(val content: String)
data class ReactionRequest(val emoji: String) // Supported: ❤️, 👍, 😂, 😮, 😢, 🙏

// ==================== CHAT MODELS ====================
data class Chat(val id: String, val participants: List<String>, val lastMessage: Message?, val unreadCount: Int = 0, val updatedAt: Long, val isGroup: Boolean = false, val groupName: String? = null, val groupIconUrl: String? = null)
data class CreateChatRequest(val participants: List<String>, val isGroup: Boolean = false, val groupName: String? = null)
data class ParticipantRequest(val userId: String)

// ==================== CALL MODELS ====================
data class CallData(val id: String, val callerId: String, val receiverId: String, val type: CallType, val status: CallStatus, val startTime: Long? = null, val endTime: Long? = null, val duration: Int? = null, val callerName: String? = null, val callerAvatar: String? = null)
enum class CallType { AUDIO, VIDEO }
enum class CallStatus { INITIATING, RINGING, ACTIVE, ENDED, MISSED, REJECTED }
data class InitiateCallRequest(val receiverId: String, val type: CallType)

// ==================== CONTACT MODELS ====================
data class Contact(val id: String, val userId: String, val contactUserId: String?, val contactName: String, val contactPhone: String?, val isRegistered: Boolean = false)
data class ContactInfo(val name: String, val phoneNumber: String?, val email: String?)
data class BlockContactRequest(val userId: String, val reason: String? = null)

// ==================== PRIVACY MODELS ====================
data class PrivacySettings(val lastSeen: VisibilityOption = VisibilityOption.EVERYONE, val profilePhoto: VisibilityOption = VisibilityOption.EVERYONE, val about: VisibilityOption = VisibilityOption.EVERYONE, val readReceipts: Boolean = true, val groupsAdd: VisibilityOption = VisibilityOption.EVERYONE)
enum class VisibilityOption { EVERYONE, CONTACTS, NOBODY }

// ==================== DEVICE MODELS ====================
data class DeviceRegistrationRequest(val userId: String? = null, val fcmToken: String, val platform: String = "android", val deviceModel: String? = null)
data class DeviceUnregisterRequest(val fcmToken: String)
```

### 6.6 Repository Classes

```kotlin
@Singleton
class AuthRepository @Inject constructor(private val api: ChatrApi) {
    suspend fun signUp(request: SignUpRequest) = safeApiCall { api.signUp(request) }
    suspend fun signIn(request: SignInRequest) = safeApiCall { api.signIn(request) }
    suspend fun signOut() = safeApiCall { api.signOut() }
    suspend fun sendOtp(phone: String) = safeApiCall { api.sendOtp(OtpRequest(phone)) }
    suspend fun verifyOtp(phone: String, otp: String) = safeApiCall { api.verifyOtp(OtpVerifyRequest(phone, otp)) }
    suspend fun getCurrentUser() = safeApiCall { api.getCurrentUser() }
}

@Singleton
class ChatRepository @Inject constructor(private val api: ChatrApi) {
    fun getChats(userId: String) = flow { emit(safeApiCall { api.getChats(userId) }) }
    fun getMessages(chatId: String, limit: Int = 50) = flow { emit(safeApiCall { api.getMessages(chatId, limit) }) }
    suspend fun sendMessage(request: SendMessageRequest) = safeApiCall { api.sendMessage(request) }
    suspend fun createChat(participants: List<String>) = safeApiCall { api.createChat(CreateChatRequest(participants)) }
}

@Singleton
class CallRepository @Inject constructor(private val api: ChatrApi) {
    suspend fun initiateCall(receiverId: String, type: CallType) = safeApiCall { api.initiateCall(InitiateCallRequest(receiverId, type)) }
    suspend fun acceptCall(callId: String) = safeApiCall { api.acceptCall(callId) }
    suspend fun rejectCall(callId: String) = safeApiCall { api.rejectCall(callId) }
    suspend fun endCall(callId: String) = safeApiCall { api.endCall(callId) }
    fun getCallHistory() = flow { emit(safeApiCall { api.getCallHistory() }) }
}

@Singleton
class ContactsRepository @Inject constructor(private val api: ContactsApi) {
    fun getContacts() = flow { emit(safeApiCall { api.getContacts() }) }
    suspend fun syncContacts(contacts: List<ContactInfo>) = safeApiCall { api.syncContacts(contacts) }
    suspend fun blockContact(userId: String) = safeApiCall { api.blockContact(BlockContactRequest(userId)) }
    suspend fun unblockContact(userId: String) = safeApiCall { api.unblockContact(userId) }
    fun getBlockedContacts() = flow { emit(safeApiCall { api.getBlockedContacts() }) }
}

@Singleton
class SearchRepository @Inject constructor(private val api: SearchApi) {
    suspend fun universalSearch(query: String, lat: Double?, lon: Double?, category: String? = null) = safeApiCall { api.universalSearch(UniversalSearchRequest(query, lat, lon, category)) }
    suspend fun aiBrowserSearch(query: String) = safeApiCall { api.aiBrowserSearch(AISearchRequest(query)) }
    suspend fun geoSearch(query: String, lat: Double, lon: Double, radius: Int = 5000) = safeApiCall { api.geoSearch(GeoSearchRequest(query, lat, lon, radius)) }
    suspend fun fetchJobs(query: String, lat: Double?, lon: Double?) = safeApiCall { api.fetchJobs(JobSearchRequest(query, lat, lon)) }
    suspend fun fetchHealthcare(query: String, lat: Double, lon: Double) = safeApiCall { api.fetchHealthcare(HealthcareSearchRequest(query, lat, lon)) }
}

@Singleton
class AIRepository @Inject constructor(private val api: AIApi) {
    suspend fun aiAssistant(message: String) = safeApiCall { api.aiAssistant(AIAssistantRequest(message)) }
    suspend fun aiAgentChat(agentId: String, message: String) = safeApiCall { api.aiAgentChat(AIAgentChatRequest(agentId, message)) }
    suspend fun checkSymptoms(symptoms: List<String>) = safeApiCall { api.checkSymptoms(SymptomCheckerRequest(symptoms)) }
    suspend fun getSmartReplies(context: String) = safeApiCall { api.getSmartReplies(SmartReplyRequest(context)) }
    suspend fun translateMessage(text: String, targetLang: String) = safeApiCall { api.translateMessage(TranslateRequest(text, targetLang)) }
}
```

### 6.7 Dependency Injection (NetworkModule.kt)

```kotlin
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    
    private const val BASE_URL = "https://sbayuqgomlflmxgicplz.supabase.co/functions/v1/"
    private const val REST_BASE_URL = "https://sbayuqgomlflmxgicplz.supabase.co/rest/v1/"
    
    @Provides @Singleton
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
    
    @Provides @Singleton @Named("functions")
    fun provideFunctionsRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder().baseUrl(BASE_URL).client(okHttpClient).addConverterFactory(GsonConverterFactory.create()).build()
    }
    
    @Provides @Singleton @Named("rest")
    fun provideRestRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder().baseUrl(REST_BASE_URL).client(okHttpClient).addConverterFactory(GsonConverterFactory.create()).build()
    }
    
    @Provides @Singleton fun provideChatrApi(@Named("functions") retrofit: Retrofit): ChatrApi = retrofit.create(ChatrApi::class.java)
    @Provides @Singleton fun provideSearchApi(@Named("functions") retrofit: Retrofit): SearchApi = retrofit.create(SearchApi::class.java)
    @Provides @Singleton fun provideAIApi(@Named("functions") retrofit: Retrofit): AIApi = retrofit.create(AIApi::class.java)
    @Provides @Singleton fun provideContactsApi(@Named("functions") retrofit: Retrofit): ContactsApi = retrofit.create(ContactsApi::class.java)
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
    <data android:scheme="https" android:host="web.chatr.chat" />
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
| `/jobs` | `chatr://jobs` | `query?: String` | `chatr://jobs?q=developer` |
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
| `/chatr-games` | `chatr://games` | - | `chatr://games` |
| `/native-apps` | `chatr://apps` | - | `chatr://apps` |
| `/earn` | `chatr://earn` | - | `chatr://earn` |
| `/join` | `chatr://join` | - | `chatr://join` |
| `/dhandha` | `chatr://dhandha` | - | `chatr://dhandha` |

---

## 8. Integration Checklist

### ✅ Phase 1: Core Setup
- [x] Retrofit Setup with `ChatrApi`, `SearchApi`, `AIApi`, `ContactsApi`
- [x] `NetworkModule` with Hilt DI
- [x] API key interceptor for auth
- [x] Repository Layer (Auth, Chat, Call, Search, AI, Contacts)

### ✅ Phase 2: Authentication
- [x] Phone OTP authentication (Firebase + Custom)
- [x] Token storage in EncryptedSharedPreferences
- [x] Auto-refresh token logic
- [x] QR Login support

### ✅ Phase 3: Real-time Communication
- [x] WebRTC with Perfect Negotiation
- [x] Dual-protocol signaling (WebSocket + Realtime)
- [x] TelecomManager integration
- [x] FCM v1 with OAuth2 for call notifications
- [x] DB trigger for automated call FCM (`notify_call_fcm`)

### ✅ Phase 4: Search Integration
- [x] Universal Search with categories
- [x] Visual Search with camera
- [x] AI Browser Search
- [x] Geo Search with location

### ✅ Phase 5: Contacts & Sync
- [x] Contact sync via `sync_user_contacts` RPC
- [x] Block/unblock via `ContactsRepository`
- [x] Phone hash privacy

### ✅ Phase 6: AI Features
- [x] AI Assistant, Agent Chat, Smart Reply
- [x] Health AI, Symptom Checker
- [x] CHATR Brain unified routing
- [x] Mental Health Assistant

### ✅ Phase 7: Location Services
- [x] GPS + IP-based location fallback
- [x] Geofence monitoring
- [x] Location-based search

### ✅ Phase 8: Notifications
- [x] FCM v1 OAuth2 push
- [x] High-priority call notifications
- [x] DB-trigger automated notifications
- [x] Scheduled notifications

### ✅ Phase 9: Deep Linking
- [x] `chatr://` scheme + `https://chatr.chat` verified links
- [x] `web.chatr.chat` desktop subdomain
- [x] Navigation graph with fragments

### ✅ Phase 10: Offline & Caching
- [x] Room database for messages
- [x] Offline message queue
- [x] MessageSyncWorker for background sync

---

## 9. WebRTC & Calling Architecture

### 9.1 Production Standards (FaceTime-Level Parity)

```
Video: VP9 codec @ adaptive bitrate (25Mbps max, 4K@60fps capable)
Audio: Opus @ 128kbps with noise suppression
Adaptive Bitrate: WebCodecs API for hardware acceleration
ICE Timeout: 60s mobile, 45s desktop
Recovery: Continuous ICE restarts every 5s if disconnected
Camera: Progressive acquisition with 5s replaceTrack timeout
Mirror: Dynamic based on facingMode (mirror front, no-mirror rear)
Audio Playback: DOM-rendered <audio> element (bypass WebView autoplay blocks)
Signaling: Perfect Negotiation pattern with duplicate answer guard
Termination: Database status authoritative (no manual 'answer' signals with 'ended')
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

### 9.3 FCM Call Notification Flow (DB Trigger)

```
calls table INSERT (status='ringing')
        │
        ▼
notify_call_fcm() trigger
        │
        ▼ net.http_post()
fcm-call-trigger edge function
        │
        ▼
FCM v1 API → Device
        │
        ▼
TelecomManager / System Ringer
```

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
val uri = Uri.parse("tel:+1234567890")
val extras = Bundle().apply {
    putString(TelecomManager.EXTRA_INCOMING_CALL_EXTRAS, "ChatrPlus")
}
telecomManager.addNewIncomingCall(phoneAccountHandle, extras)
```

### 9.5 Ringing Behavior
- **Native platforms**: OS ringer via `useNativeRingtone.tsx` (skips web audio)
- **Web**: Web Audio API ringtone
- **Single source**: Only one ringing mechanism active to prevent multiple rings
- **No auto-reject**: Calls ring until explicit user action

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
    ┌───────────┬───────────┬───────────┬───────────┬───────────┬───────────┐
    │ Personal  │ Work AI   │ Search AI │ Local     │ Job       │ Health AI │
    │ AI        │           │           │ Services  │ Matching  │           │
    │ (habits)  │ (tasks)   │ (answers) │ (booking) │ (resume)  │ (symptoms)│
    └───────────┴───────────┴───────────┴───────────┴───────────┴───────────┘
```

### 10.2 Specialized Agents

| Agent | Type | Purpose | Actions |
|-------|------|---------|---------|
| Personal AI | `personal` | Learns habits, tone, preferences | Reminders, personalization |
| Work AI | `work` | Tasks, docs, meetings | Summarize, schedule, organize |
| Search AI | `search` | Perplexity-style answers | Web search with citations |
| Local Services | `local` | Plumbers, food, groceries, doctors | Book, order, schedule |
| Job-Matching AI | `jobs` | Resume to job application | Apply, match, prepare |
| Health AI | `health` | Symptoms, doctor search | Check symptoms, find doctors |

### 10.3 Intent Categories

| Intent | Description | Trigger Examples |
|--------|-------------|-----------------|
| `question` | Asking for information | "What is...", "How do I..." |
| `action` | Wants to complete a task | "Book a...", "Order..." |
| `search` | Looking for something | "Find...", "Show me..." |
| `booking` | Wants to book/schedule | "Schedule...", "Appointment..." |
| `transaction` | Wants to pay/buy | "Pay...", "Buy..." |
| `support` | Needs help/guidance | "Help me...", "I need..." |
| `conversation` | General chat | Casual conversation |

### 10.4 Action Types

| Action | Description |
|--------|-------------|
| `book_appointment` | Book healthcare/service appointment |
| `apply_job` | Apply to job listing |
| `order_food` | Place food order |
| `make_payment` | Process payment |
| `save_contact` | Save a contact |
| `set_reminder` | Set a reminder |
| `file_complaint` | File a complaint |
| `call_service` | Call a service provider |
| `navigate` | Navigate to a route |

### 10.5 Cross-Agent Intelligence

```typescript
interface SharedContext {
  userId: string;
  location: { lat?: number; lon?: number; city?: string; state?: string; };
  preferences: { responseStyle: 'detailed'|'concise'|'technical'|'simple'; language: string; tone: 'formal'|'casual'|'friendly'; };
  memory: { recentQueries: string[]; interests: string[]; healthHistory?: string[]; jobPreferences?: { skills: string[]; salary?: number; type?: string; }; savedLocations?: string[]; };
  session: { conversationId?: string; lastAgent?: AgentType; lastAction?: ActionType; timestamp: Date; };
}
```

---

## 11. Database Triggers & Automation

### 11.1 Active Triggers

| Trigger | Table | Event | Function | Description |
|---------|-------|-------|----------|-------------|
| `call_fcm_trigger` | `calls` | AFTER INSERT (status='ringing') | `notify_call_fcm()` | Auto-send FCM push for incoming calls |
| `set_message_expiry_trigger` | `messages` | BEFORE INSERT | `set_message_expiry()` | Set disappearing message expiry |
| `update_message_delivery_trigger` | `messages` | AFTER UPDATE | `update_message_delivery()` | Update delivery status on read |
| `normalize_phone_trigger` | `profiles` | BEFORE INSERT/UPDATE | `normalize_phone_search()` | Normalize phone for search |
| `encrypt_bmi_trigger` | `bmi_records` | BEFORE INSERT | `encrypt_bmi_on_save()` | Encrypt health data at rest |
| `encrypt_kyc_trigger` | `kyc_verifications` | BEFORE INSERT | `encrypt_kyc_on_save()` | Encrypt KYC documents |
| `update_follower_count_trigger` | `account_followers` | INSERT/DELETE | `update_follower_count()` | Auto-update follower counts |
| `update_app_rating_trigger` | `app_reviews` | AFTER INSERT | `update_app_rating()` | Recalculate app rating |
| `update_provider_rating_trigger` | `service_reviews` | AFTER INSERT | `update_provider_rating()` | Recalculate provider rating |
| `update_tutor_rating_trigger` | `tutor_reviews` | AFTER INSERT | `update_tutor_rating()` | Recalculate tutor rating |
| `update_fame_score_trigger` | `fame_posts` | AFTER INSERT | `update_fame_score()` | Update fame leaderboard |
| `process_invite_signup_trigger` | `profiles` | AFTER INSERT | `process_invite_signup()` | Reward inviter on signup |
| `create_default_pipeline_trigger` | `business_profiles` | AFTER INSERT | `create_default_crm_pipeline()` | Auto-create CRM pipeline |
| `create_notification_prefs_trigger` | `profiles` | AFTER INSERT | `create_default_notification_preferences()` | Default notification settings |
| `handle_new_user_trigger` | `auth.users` | AFTER INSERT | `handle_new_user()` | Create profile + welcome points |

### 11.2 Scheduled Cleanup Functions

| Function | Description | Interval |
|----------|-------------|----------|
| `cleanup_expired_messages()` | Delete expired disappearing messages | Periodic |
| `cleanup_old_webrtc_signals()` | Remove signals older than 5 min | Periodic |
| `cleanup_expired_qr_sessions()` | Expire pending QR login sessions | Periodic |
| `cleanup_old_fcm_delivery_logs()` | Remove FCM logs older than 7 days | Daily |
| `cleanup_expired_visual_search_cache()` | Clear expired visual search cache | Periodic |
| `clean_expired_geo_cache()` | Clear expired geo cache | Periodic |
| `expire_old_inter_app_messages()` | Expire old inter-app messages | Periodic |
| `auto_delete_old_location_data()` | Nullify location data after 30 days | Trigger-based |

---

## Summary Statistics

| Category | Count |
|----------|-------|
| REST API Endpoints | 100+ |
| Edge Functions | 95+ |
| WebSocket Channels | 7 |
| Search Endpoints | 12 |
| Frontend Routes | 165+ |
| Desktop Routes | 5 |
| Deep Link Routes | 60+ |
| Data Models | 65+ |
| Retrofit Interfaces | 4 |
| Repositories | 6 |
| Database RPC Functions | 50+ |
| Database Triggers | 16+ |
| AI Agents | 6 |
| Native Android Components | 15+ |

---

## Changelog

### v4.0.0 (February 20, 2026)
**Comprehensive Documentation Refresh:**
- Updated all route tables to match actual `App.tsx` (165+ routes)
- Added Desktop Layout routes (`/desktop/*` for `web.chatr.chat`)
- Added Vendor Portal routes (`/vendor/*` for food/doctor vendors)
- Added Medicine Subscription routes (`/care/medicines/*`)
- Added Earning/Micro-Tasks routes (`/earn`, `/earn/history`)
- Added Dhandha (business) route
- Added missing health routes: `/medication-interactions`, `/health-streaks`, `/chronic-vitals`
- Added `/join` invite landing page
- Added `/web` ChatrWeb entry point
- Added `/chatr-games` route
- Added `/mini-apps` store route
- Added `/seller/settlements` route

**Calling System Updates:**
- FaceTime-level parity specs: 4K@60fps, WebCodecs API, Insertable Streams
- DOM-rendered `<audio>` element for mobile WebView audio playback
- Database trigger `notify_call_fcm()` for automated call notifications via `fcm-call-trigger`
- Extended ICE timeouts (60s mobile / 45s desktop)
- Camera stability: progressive acquisition, 5s replaceTrack timeout, dynamic mirroring
- Single ringing mechanism: native OS ringer on mobile, web audio on desktop
- Perfect Negotiation pattern with duplicate answer guard
- Database status as authoritative termination signal

**New Edge Functions (since v3.0.0):**
- `fcm-call-trigger` - DB-trigger initiated FCM call notifications
- `ai-chat-assistant` - Conversational AI chat
- `ai-chat-summary` - AI-powered chat summaries
- `ai-coaching` - Life coaching AI
- `ai-voice-summarize` - Voice message summarization
- `ai-message-insights` - Chat analytics insights
- `agent-voice-tts` - Text-to-speech for AI agents
- `auto-translate` - Auto-detect and translate
- `call-sentiment` - Call sentiment analysis
- `call-summary` - Call summary generation
- `live-transcription` - Real-time speech transcription
- `live-translate` - Real-time call translation
- `parse-prescription` - OCR prescription parsing
- `nutrition-tracker` - Nutrition data logging
- `health-passport-export` - Health record export
- `process-daily-login-streak` - Streak-based login rewards
- `notify-referral-join` - Referral join notifications
- `pstn-call` - PSTN phone call bridge
- `crawl-jobs` - Job board crawler
- `send-broadcast-email` - Broadcast email service
- `send-sms` - SMS notification service
- `app-version` - App version checker
- `verify-micro-task` - Micro-task verification
- `world-content-moderation` - Content moderation
- `chatr-world-search` - Social content search

**Architecture Updates:**
- ContactsApi and ContactsRepository added to Retrofit interfaces
- DeviceUnregisterRequest added for FCM token cleanup
- OtpRequest/OtpVerifyRequest updated with Firebase UID support
- Expanded RPC functions documentation (50+ functions)
- Database triggers documentation section added (16+ triggers)
- Scheduled cleanup functions documented
- Updated summary statistics

**Security & Data:**
- Encrypted health data at rest (BMI, KYC)
- Phone hash privacy for contact matching
- Location data auto-deletion after 30 days
- WebRTC signal cleanup (5-minute TTL)

### v3.0.0 (January 2, 2026)
- Android Native Architecture overhaul
- Dual-protocol signaling (WebSocket + Realtime)
- FCM v1 migration with OAuth2
- CHATR Brain AI System with 6 specialized agents
- SecureStore credential sync

### v2.1.0 (December 21, 2025)
- JWT-aware RPC functions
- Fixed "Unknown" user issue
- Supabase REST API routing for Android

### v2.0.0 (December 20, 2025)
- Message reactions, privacy settings, block/unblock
- Typing indicators, message pinning/starring/forwarding

### v1.0.0 (December 3, 2025)
- Initial documentation release

---

**Document Version**: 4.0.0  
**Generated**: 2026-02-20  
**Domain**: chatr.chat
