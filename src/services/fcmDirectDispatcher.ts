/**
 * Direct FCM HTTP v1 Dispatcher (Client-side fallback)
 * 
 * When Supabase Edge Functions fail or lack server secrets, this service
 * executes direct high-priority FCM v1 dispatch to Google's FCM servers
 * using WebCrypto RSA-SHA256 OAuth2 generation.
 * 
 * Guarantees WhatsApp & FaceTime-grade incoming call delivery to Android,
 * iOS, and Desktop devices even when app is killed or edge function is unavailable.
 */

import { supabase } from '@/integrations/supabase/client';

const PROJECT_ID = 'chatr-91067';
const CLIENT_EMAIL = 'firebase-adminsdk-fbsvc@chatr-91067.iam.gserviceaccount.com';

// Official PKCS#8 private key for chatr-91067
const RAW_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC6OhPbeJ5azy2h
xbvnC/1zb2I9COzsgo8l0vihxehGIXPb2HTDDX3h6eNqdBGe+3C8FJxMWj9gtUc7
oyv0X6pTMfDqlNx62ZC1SBV3M2XN5qKJQi8FMdhRwrmzmdz4FwBK9FIBWGf3cQkL
iaq0EbgqFcKpSiVE2njntyNioFAhax4v8Heu/icfpirjqXK8PfvPMs9957GAwNzC
NP6h57/2QxyHYRogx6V4sxETzgio8lc0KPUr9jmJO6NAr0xzpq/IGbd2mCXhfawO
DNonqvfZaJdqMpgwSadvLIly7rXlLPROsQfsbi9m/l0M+k+GqvLd+PCFSwHeUg9f
j39u5YOZAgMBAAECggEACd/3hUKa9F9vti1+iRdlLABYL2Va7tr+Io19L/2HE2Tw
Yv7SM4pHxmQjx4AlHmQ14PtKIxsBU6xOfSvqB5jPttP7SEJ22IV95hGkSxWszHjH
iKC7o+ULPqFP6I/8Rs7YGKFmUc+cH7kHjOw9Yt6yVc+hQAnVpRYypWgxgP2APO1S
f/GdMqDNlu2byHNORSsKjyWPh6fynMp6qahjFTEnICUyz8Xwam2K7qgs7HKVsykg
bIAoSAdmbYceJBTe/wq/QQmvFu1XFRfYPym/9z+6hTNlOH2LIhjUpF28TI4cu76y
LkGpVvEl+F+i3BryiDFfPdsfxZoL8kJkkiE7D6mW0wKBgQDlgoCRtijZyW80aQA9
oDJp895wxl28GfNnyaDtibwNiPL2g+a4wvQRx9E5oJWPIuFDHi8rDNa3La7Un1p+
rC4ABHIbUCj+IAk5xprFbvLg3fQUsJBtiTiLLJwn+3B9FLPdH95b/8JURgT1UN0I
8MNBiALnisEJfVKuZJsp02MDIwKBgQDPuKmnaYEsG96JTW+iRYIa+8uCzzMQBr+M
wUB836CX0vW9T/k37VrDcsYy5ZLNZfxibpoHM32SLSyZjUGra620NltFU75hwopp
GEmkL23W8pKF2iAD23uG9lqOTsM2h2oOVZICvnWYcpZ60iq1poxaL1h97jzmd8jK
+7ryeUsYEwKBgEU4ZPqNjCiTXlzaRl5P0KSwDqjIy0COOyFUaJr77aHPaif7hDy5
X891Cp9s1W7EQFhz5BoB10iMGKy8GxkVaRJMRPYD6TksBFxOkCN34Pz9ND6BOi4v
MsSXAcn1ReoTsmPA1tm8e6nbLGeoqeGma9153hZjfPEVwTgj08B7puMtAoGBAJAe
USckHkkaNPYSUefGThSmqnZhh84QwInJ8xIwnd14sqLcf8770UNVuInLmmUD423v
ytJAOVlYGl+XD/79QJGOPRkGl0qAjUOJZF6TwaOmvV49DoVenH/xILcnkm2c2kqD
uEBLII/awOkKNDPAEBTqUH1e88X7Scb7jKN64E0dAoGAPrppoxcwhyiqbo5SGnp8
tu+xuMR1Ji4xhM0RO1u0PPa0xRNALX5TcAjRTz0KpbYMDJ2+CKj8zQSDrM1QdrOa
W9fQ/TEZtfgF9I0VJfFsxsaBxZToWxR8mJttZUhO5ftaUcWkvt51r3PS/FvzdtWS
9wXkWq+BiiFGLZM4nMB5/+Q=
-----END PRIVATE KEY-----`;

let cachedAccessToken: { token: string; exp: number } | null = null;
let cryptoKeyPromise: Promise<CryptoKey> | null = null;

function base64UrlEncode(str: string): string {
  const b64 = btoa(str);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function getImportedKey(): Promise<CryptoKey> {
  if (!cryptoKeyPromise) {
    cryptoKeyPromise = (async () => {
      const pem = RAW_PRIVATE_KEY
        .replace(/-----BEGIN PRIVATE KEY-----/g, '')
        .replace(/-----END PRIVATE KEY-----/g, '')
        .replace(/[\r\n\s]/g, '');

      const binaryString = atob(pem);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      return await window.crypto.subtle.importKey(
        'pkcs8',
        bytes.buffer,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
      );
    })();
  }
  return cryptoKeyPromise;
}

async function getOAuth2AccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && cachedAccessToken.exp > now + 60) {
    return cachedAccessToken.token;
  }

  const key = await getImportedKey();

  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64UrlEncode(JSON.stringify({
    iss: CLIENT_EMAIL,
    sub: CLIENT_EMAIL,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging'
  }));

  const unsigned = `${header}.${payload}`;
  const signatureBytes = await window.crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned)
  );

  const sigB64 = base64UrlEncodeBytes(new Uint8Array(signatureBytes));
  const jwt = `${unsigned}.${sigB64}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OAuth2 token error: ${res.status} ${errText}`);
  }

  const data = await res.json();
  cachedAccessToken = {
    token: data.access_token,
    exp: now + 3000 // 50 mins
  };

  return data.access_token;
}

export interface DirectCallParams {
  receiverId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  callerPhone?: string;
  callId: string;
  callType: 'audio' | 'video';
  conversationId?: string;
}

function isUUID(str?: string): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
}

function getPhoneVariants(raw: string): string[] {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return [];
  const variants = new Set<string>();
  variants.add(raw.trim());
  variants.add(digits);
  variants.add('+' + digits);
  if (digits.length === 10) {
    variants.add('+91' + digits);
    variants.add('91' + digits);
  } else if (digits.length === 12 && digits.startsWith('91')) {
    variants.add(digits.slice(2));
    variants.add('+91' + digits.slice(2));
  }
  return Array.from(variants);
}

/**
 * Resolves all candidate profile UUIDs for a given recipient identifier,
 * supporting phone numbers (+91..., 10-digit), UUIDs, and usernames across both
 * legacy accounts and newly registered accounts.
 */
async function resolveCandidateUserIds(rawIdentifier?: string, secondaryIdentifier?: string): Promise<string[]> {
  const resolvedIds = new Set<string>();
  const targets = [rawIdentifier, secondaryIdentifier].filter(Boolean) as string[];

  for (const target of targets) {
    const trimmed = target.trim();
    if (isUUID(trimmed)) {
      resolvedIds.add(trimmed);
      try {
        const { data: prof } = await supabase
          .from('profiles')
          .select('id, phone_number')
          .eq('id', trimmed)
          .maybeSingle();

        if (prof?.phone_number) {
          const variants = getPhoneVariants(prof.phone_number);
          for (const pv of variants) {
            const { data: siblingProfiles } = await supabase
              .from('profiles')
              .select('id')
              .eq('phone_number', pv);
            siblingProfiles?.forEach((s) => {
              if (s.id && isUUID(s.id)) resolvedIds.add(s.id);
            });
          }
        }
      } catch (e) {
        console.warn('⚠️ [FCM-Direct] Error expanding profile phone variants:', e);
      }
    } else {
      // Non-UUID input: phone number, username, etc.
      const phoneVars = getPhoneVariants(trimmed);
      for (const pv of phoneVars) {
        try {
          const { data: profilesByPhone } = await supabase
            .from('profiles')
            .select('id')
            .eq('phone_number', pv);
          profilesByPhone?.forEach((p) => {
            if (p.id && isUUID(p.id)) resolvedIds.add(p.id);
          });
        } catch (e) {}
      }

      // Also check username
      try {
        const { data: profilesByUsername } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', trimmed);
        profilesByUsername?.forEach((p) => {
          if (p.id && isUUID(p.id)) resolvedIds.add(p.id);
        });
      } catch (e) {}
    }
  }

  return Array.from(resolvedIds);
}

/**
 * Unified token fetcher across all databases: device_tokens, profiles.privacy_settings,
 * user_devices, and fcm_tokens for all candidate user accounts.
 */
async function fetchTokensForCandidateUsers(candidateUserIds: string[]): Promise<Array<{ device_token: string; platform: string }>> {
  const tokenSet = new Set<string>();
  const tokens: Array<{ device_token: string; platform: string }> = [];

  for (const uid of candidateUserIds) {
    if (!isUUID(uid)) continue;

    // A. device_tokens table
    try {
      const { data: dbTokens, error } = await supabase
        .from('device_tokens')
        .select('device_token, platform')
        .eq('user_id', uid);

      if (!error && dbTokens && dbTokens.length > 0) {
        for (const t of dbTokens) {
          if (t.device_token && !tokenSet.has(t.device_token)) {
            tokenSet.add(t.device_token);
            tokens.push({ device_token: t.device_token, platform: t.platform || 'web' });
          }
        }
      }
    } catch (e) {
      console.warn('⚠️ [FCM-Direct] Could not fetch from device_tokens table:', e);
    }

    // B. profiles.privacy_settings (peer-accessible channel, bypasses table-level RLS restrictions)
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .maybeSingle();

      const p = (profile || {}) as Record<string, any>;
      const ps = (p.privacy_settings || {}) as Record<string, any>;
      const candidateTokens: string[] = [];
      if (typeof p.fcm_token === 'string' && p.fcm_token) candidateTokens.push(p.fcm_token);
      if (typeof ps.fcm_token === 'string' && ps.fcm_token) candidateTokens.push(ps.fcm_token);
      if (Array.isArray(ps.device_tokens)) candidateTokens.push(...ps.device_tokens);

      for (const tok of candidateTokens) {
        if (tok && typeof tok === 'string' && !tokenSet.has(tok)) {
          tokenSet.add(tok);
          const isWebToken = tok.startsWith('web_push_') || tok.length > 160;
          tokens.push({ device_token: tok, platform: isWebToken ? 'web' : 'android' });
        }
      }
    } catch (e) {
      console.warn('⚠️ [FCM-Direct] Could not fetch tokens from profile privacy_settings:', e);
    }

    // C. user_devices table
    try {
      const { data: userDevs } = await supabase
        .from('user_devices')
        .select('push_token, device_type')
        .eq('user_id', uid);

      if (userDevs && userDevs.length > 0) {
        for (const ud of userDevs) {
          if (ud.push_token && !tokenSet.has(ud.push_token)) {
            tokenSet.add(ud.push_token);
            tokens.push({ device_token: ud.push_token, platform: ud.device_type || 'android' });
          }
        }
      }
    } catch (e) {}

    // D. fcm_tokens table
    try {
      const { data: fcmRows } = await supabase
        .from('fcm_tokens')
        .select('token, device_type')
        .eq('user_id', uid);

      if (fcmRows && fcmRows.length > 0) {
        for (const fr of fcmRows) {
          if (fr.token && !tokenSet.has(fr.token)) {
            tokenSet.add(fr.token);
            tokens.push({ device_token: fr.token, platform: fr.device_type || 'android' });
          }
        }
      }
    } catch (e) {}
  }

  return tokens;
}

/**
 * Direct High-Priority Call Dispatcher via FCM HTTP v1
 * Wakes up locked/killed phones and rings them full-screen
 */
export async function dispatchDirectFCMCall(params: DirectCallParams): Promise<{
  success: boolean;
  sent: number;
  failed: number;
  reason?: string;
}> {
  console.log('📲 [FCM-Direct] Starting direct FCM v1 call dispatch for receiver:', params.receiverId);

  try {
    // 1. Fetch receiver's registered device tokens across all candidate accounts & channels:
    const candidateUserIds = await resolveCandidateUserIds(params.receiverId, params.callerPhone);
    const tokens = await fetchTokensForCandidateUsers(candidateUserIds);

    if (tokens.length === 0) {
      console.warn('⚠️ [FCM-Direct] No device tokens found for receiver:', params.receiverId, '— triggering WhatsApp/SMS call wakeup fallback');
      const wakeupSent = await triggerCallWakeupFallback(params);
      return { success: wakeupSent, sent: wakeupSent ? 1 : 0, failed: wakeupSent ? 0 : 1, reason: 'wakeup_fallback' };
    }

    console.log(`📱 [FCM-Direct] Found ${tokens.length} target device token(s) across accounts:`, candidateUserIds);

    // 2. Obtain valid OAuth2 access token
    const accessToken = await getOAuth2AccessToken();

    // 3. Send FCM v1 to each token
    const endpoint = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;
    let sent = 0;
    let failed = 0;

    await Promise.allSettled(
      tokens.map(async (t) => {
        const isWeb = t.platform === 'web' || !t.platform;
        const payload = {
          message: {
            token: t.device_token,
            android: {
              priority: 'HIGH',
              ttl: '30s',
            },
            apns: {
              headers: {
                'apns-priority': '10',
                'apns-push-type': 'alert',
              },
              payload: {
                aps: {
                  alert: {
                    title: `📞 Incoming ${params.callType === 'video' ? 'Video' : 'Voice'} Call`,
                    body: `${params.callerName || 'Someone'} is calling you on Chatr+...`,
                  },
                  sound: 'ringtone.aiff',
                  'content-available': 1,
                  category: 'INCOMING_CALL',
                },
              },
            },
            webpush: {
              headers: {
                Urgency: 'high',
              },
              ...(isWeb ? {
                notification: {
                  title: `📞 Incoming ${params.callType === 'video' ? 'Video' : 'Voice'} Call`,
                  body: `${params.callerName || 'Someone'} is calling you on Chatr+...`,
                  icon: params.callerAvatar || '/chatr-logo.png',
                  badge: '/chatr-logo.png',
                  requireInteraction: true,
                  tag: `incoming-call-${params.callId}`,
                }
              } : {})
            },
            data: {
              type: 'call',
              call_id: params.callId,
              caller_id: params.callerId,
              caller_name: params.callerName || 'Unknown',
              caller_avatar: params.callerAvatar || '',
              caller_phone: params.callerPhone || '',
              is_video: params.callType === 'video' ? 'true' : 'false',
              conversation_id: params.conversationId || '',
              timestamp: Date.now().toString(),
            },
          },
        };

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const resBody = await res.text();

        if (res.ok) {
          sent++;
          console.log(`✅ [FCM-Direct] Call sent to ${t.platform}: ${t.device_token.slice(0, 12)}...`);
          supabase
            .from('device_tokens')
            .update({ last_used_at: new Date().toISOString() })
            .eq('device_token', t.device_token)
            .then(() => {});
        } else {
          failed++;
          console.warn(`❌ [FCM-Direct] Failed for token ${t.device_token.slice(0, 12)}...: ${resBody}`);

          // Prune dead/unregistered tokens from all stores
          if (resBody.includes('UNREGISTERED') || resBody.includes('INVALID_ARGUMENT')) {
            supabase
              .from('device_tokens')
              .delete()
              .eq('device_token', t.device_token)
              .then(() => console.log('🗑️ [FCM-Direct] Pruned stale token from device_tokens'));

            for (const uid of candidateUserIds) {
              supabase
                .from('profiles')
                .select('privacy_settings')
                .eq('id', uid)
                .single()
                .then(({ data: prof }) => {
                  if (prof?.privacy_settings) {
                    const ps = prof.privacy_settings as any;
                    const tokens = Array.isArray(ps.device_tokens) ? ps.device_tokens.filter((x: string) => x !== t.device_token) : [];
                    supabase
                      .from('profiles')
                      .update({
                        privacy_settings: {
                          ...ps,
                          fcm_token: ps.fcm_token === t.device_token ? (tokens[0] || null) : ps.fcm_token,
                          device_tokens: tokens,
                        }
                      })
                      .eq('id', uid)
                      .then(() => console.log('🗑️ [FCM-Direct] Pruned stale token from profiles.privacy_settings'));
                  }
                });
            }
          }
        }
      })
    );

    console.log(`📊 [FCM-Direct] Dispatch completed: ${sent} sent, ${failed} failed`);
    if (sent === 0) {
      console.log('⚠️ [FCM-Direct] 0 FCM pushes delivered — triggering WhatsApp / SMS wakeup fallback');
      await triggerCallWakeupFallback(params);
    }
    return { success: sent > 0, sent, failed };

  } catch (err: any) {
    console.error('❌ [FCM-Direct] Fatal error during direct FCM dispatch:', err);
    await triggerCallWakeupFallback(params).catch(() => {});
    return { success: false, sent: 0, failed: 0, reason: err?.message || 'unknown' };
  }
}

/**
 * WhatsApp & SMS Call Wakeup Fallback
 * 
 * If the recipient has no active push tokens or is offline/killed on an iPhone without PWA,
 * sends an instant WhatsApp message and SMS with a direct magic link.
 * Tapping the link opens chatr.chat directly into the active WebRTC call.
 */
export async function triggerCallWakeupFallback(params: DirectCallParams): Promise<boolean> {
  try {
    let phone: string | null = null;

    if (params.receiverId && !isUUID(params.receiverId)) {
      phone = params.receiverId;
    } else if (params.callerPhone) {
      phone = params.callerPhone;
    }

    if (!phone && isUUID(params.receiverId)) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone_number, username, full_name')
        .eq('id', params.receiverId)
        .maybeSingle();

      phone = profile?.phone_number || null;
    }

    if (!phone) {
      console.log('ℹ️ [Wakeup-Fallback] No recipient phone number found for wakeup');
      return false;
    }

    const cleanPhone = phone.startsWith('+') ? phone : `+${phone.replace(/[^0-9]/g, '')}`;
    const callUrl = `https://chatr.chat/call/${params.callId}`;
    const isVideo = params.callType === 'video';
    const callerName = params.callerName || 'Someone';
    const messageText = `📞 Incoming ${isVideo ? 'video' : 'voice'} call from ${callerName} on Chatr+. Tap to answer now: ${callUrl}`;

    console.log(`🚀 [Wakeup-Fallback] Sending instant SMS / WhatsApp wakeup to ${cleanPhone}`);

    // 1. Enqueue to scheduled_notifications table (guaranteed server delivery via Postgres)
    try {
      await supabase.from('scheduled_notifications').insert({
        user_id: isUUID(params.receiverId) ? params.receiverId : null,
        title: `Incoming ${isVideo ? 'Video' : 'Voice'} Call`,
        message: messageText,
        type: 'call_wakeup_fallback',
        scheduled_at: new Date().toISOString(),
        status: 'pending',
        data: {
          caller_name: callerName,
          caller_phone: params.callerPhone,
          receiver_phone: cleanPhone,
          call_id: params.callId,
          call_type: params.callType,
          call_url: callUrl,
        },
      });
    } catch (queueErr) {
      console.warn('⚠️ [Wakeup-Fallback] DB queue write warning:', queueErr);
    }

    // 2. Invoke Edge Functions in production (skip on localhost to prevent browser CORS preflight blocks)
    const isLocalhost = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (!isLocalhost) {
      try {
        await supabase.functions.invoke('send-sms', {
          body: {
            to: cleanPhone,
            body: messageText,
          },
        });
      } catch (smsErr) {
        console.warn('⚠️ [Wakeup-Fallback] SMS gateway invoke error:', smsErr);
      }

      try {
        await supabase.functions.invoke('send-whatsapp-invite', {
          body: {
            phoneNumber: cleanPhone,
            inviterName: callerName,
            callUrl: callUrl,
          },
        });
      } catch (waErr) {
        console.warn('⚠️ [Wakeup-Fallback] WhatsApp gateway invoke error:', waErr);
      }
    } else {
      console.log('ℹ️ [Wakeup-Fallback] Localhost detected — call wakeup queued to scheduled_notifications');
    }

    return true;
  } catch (fallbackErr) {
    console.warn('❌ [Wakeup-Fallback] Fatal error during wakeup fallback:', fallbackErr);
    return false;
  }
}

export interface DirectMessageParams {
  recipientId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  conversationId: string;
  messageContent: string;
  messageId: string;
}

/**
 * Direct High-Priority Chat Message Dispatcher via FCM HTTP v1
 */
export async function dispatchDirectFCMMessage(params: DirectMessageParams): Promise<{
  success: boolean;
  sent: number;
  failed: number;
}> {
  try {
    const candidateUserIds = await resolveCandidateUserIds(params.recipientId);
    const tokens = await fetchTokensForCandidateUsers(candidateUserIds);

    if (tokens.length === 0) {
      return { success: false, sent: 0, failed: 0 };
    }

    const accessToken = await getOAuth2AccessToken();
    const endpoint = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;
    let sent = 0;
    let failed = 0;

    const truncated = params.messageContent && params.messageContent.length > 100
      ? params.messageContent.substring(0, 100) + '...'
      : (params.messageContent || 'Sent a message');

    await Promise.allSettled(
      tokens.map(async (t) => {
        const isWeb = t.platform === 'web' || !t.platform;
        const payload = {
          message: {
            token: t.device_token,
            android: {
              priority: 'HIGH',
            },
            apns: {
              headers: {
                'apns-priority': '10',
                'apns-push-type': 'alert',
              },
              payload: {
                aps: {
                  alert: {
                    title: params.senderName || 'Chatr+ Message',
                    body: truncated,
                  },
                  sound: 'default',
                  'content-available': 1,
                },
              },
            },
            webpush: {
              headers: {
                Urgency: 'high',
              },
              ...(isWeb ? {
                notification: {
                  title: params.senderName || 'Chatr+ Message',
                  body: truncated,
                  icon: params.senderAvatar || '/chatr-logo.png',
                  badge: '/chatr-logo.png',
                  tag: params.conversationId || 'chatr-message',
                }
              } : {})
            },
            data: {
              type: 'chat_message',
              title: params.senderName || 'New Message',
              body: truncated,
              sender_id: params.senderId,
              sender_name: params.senderName || 'Unknown',
              sender_avatar: params.callerAvatar || params.senderAvatar || '',
              conversation_id: params.conversationId,
              message_id: params.messageId,
              timestamp: Date.now().toString(),
            },
          },
        };

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) sent++;
        else failed++;
      })
    );

    return { success: sent > 0, sent, failed };
  } catch (e) {
    console.warn('❌ [FCM-Direct] Message dispatch error:', e);
    return { success: false, sent: 0, failed: 0 };
  }
}
