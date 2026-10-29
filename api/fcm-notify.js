// api/fcm-notify.js
// Vercel Serverless Function — High-Priority FCM v1 Push Notification Dispatcher
// Runs on Vercel Node.js backend (eliminates browser CORS restrictions)

import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://nuuuqazaoaozgblmvkzn.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_HRiuUoHejwLnOdITsW36Ew_ZSZ513Tw';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const PROJECT_ID = 'chatr-91067';
const CLIENT_EMAIL = 'firebase-adminsdk-fbsvc@chatr-91067.iam.gserviceaccount.com';
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

let cachedOAuth2Token = null;

function base64UrlEncode(str) {
  return Buffer.from(str).toString('base64url');
}

async function getOAuth2AccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedOAuth2Token && cachedOAuth2Token.exp > now + 60) {
    return cachedOAuth2Token.token;
  }

  const pem = RAW_PRIVATE_KEY
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/[\r\n\s]/g, '');

  const buf = Buffer.from(pem, 'base64');
  const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    arrayBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64UrlEncode(JSON.stringify({
    iss: CLIENT_EMAIL,
    sub: CLIENT_EMAIL,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging'
  }));

  const unsignedToken = `${header}.${payload}`;
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    Buffer.from(unsignedToken)
  );

  const signatureB64 = Buffer.from(signature).toString('base64url');
  const jwt = `${unsignedToken}.${signatureB64}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + jwt
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OAuth2 token error: ${res.status} ${errText}`);
  }

  const data = await res.json();
  cachedOAuth2Token = {
    token: data.access_token,
    exp: now + 3000
  };
  return data.access_token;
}

function isUUID(str) {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str).trim());
}

function getPhoneVariants(raw) {
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return [];
  const variants = new Set();
  variants.add(String(raw).trim());
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

async function resolveCandidateUserIds(rawIdentifier, secondaryIdentifier) {
  const resolvedIds = new Set();
  const targets = [rawIdentifier, secondaryIdentifier].filter(Boolean);

  for (const target of targets) {
    const trimmed = String(target).trim();
    if (isUUID(trimmed)) {
      resolvedIds.add(trimmed);
      try {
        const { data: prof } = await supabase
          .from('profiles')
          .select('id, phone_number, phone_search')
          .eq('id', trimmed)
          .maybeSingle();

        const phoneVal = prof?.phone_number || prof?.phone_search;
        if (phoneVal) {
          const variants = getPhoneVariants(phoneVal);
          for (const pv of variants) {
            const { data: siblingProfiles } = await supabase
              .from('profiles')
              .select('id')
              .or(`phone_number.eq.${pv},phone_search.eq.${pv}`);
            siblingProfiles?.forEach((s) => {
              if (s.id && isUUID(s.id)) resolvedIds.add(s.id);
            });
          }
        }
      } catch (e) {}
    } else {
      const phoneVars = getPhoneVariants(trimmed);
      for (const pv of phoneVars) {
        try {
          const { data: profilesByPhone } = await supabase
            .from('profiles')
            .select('id')
            .or(`phone_number.eq.${pv},phone_search.eq.${pv}`);
          profilesByPhone?.forEach((p) => {
            if (p.id && isUUID(p.id)) resolvedIds.add(p.id);
          });
        } catch (e) {}
      }

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

async function fetchTokensForCandidateUsers(candidateUserIds) {
  const tokenSet = new Set();
  const tokens = [];

  for (const uid of candidateUserIds) {
    if (!isUUID(uid)) continue;

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
    } catch (e) {}

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .maybeSingle();

      const p = profile || {};
      const ps = p.privacy_settings || {};
      const candidateTokens = [];
      if (typeof p.fcm_token === 'string' && p.fcm_token) candidateTokens.push(p.fcm_token);
      if (typeof ps.fcm_token === 'string' && ps.fcm_token) candidateTokens.push(ps.fcm_token);
      if (Array.isArray(ps.device_tokens)) candidateTokens.push(...ps.device_tokens);

      for (const tok of candidateTokens) {
        if (tok && typeof tok === 'string' && !tokenSet.has(tok)) {
          // FCM v1 registration tokens contain ':' (e.g. token:APA91b...) or standard FCM length
          const looksLikeFcm = tok.includes(':') || (tok.length >= 120 && !tok.startsWith('web_push_'));
          if (!looksLikeFcm && !tok.includes(':APA91b')) {
            // Raw VAPID key or malformed non-FCM token, skip to prevent FCM HTTP v1 rejection
            continue;
          }
          tokenSet.add(tok);
          const isWebToken = tok.startsWith('web_push_') || tok.length > 165;
          tokens.push({ device_token: tok, platform: isWebToken ? 'web' : 'android' });
        }
      }
    } catch (e) {}

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-client-info, apikey');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};
    const type = body.type || 'call';

    if (type === 'call') {
      const receiverId = body.receiverId;
      const callerId = body.callerId || '';
      const callerName = body.callerName || 'Chatr User';
      const callerAvatar = body.callerAvatar || '';
      const callerPhone = body.callerPhone || '';
      const receiverPhone = body.receiverPhone || body.receiver_phone || '';
      const callId = body.callId || ('call_' + Date.now());
      const callType = body.callType === 'video' ? 'video' : 'audio';
      const conversationId = body.conversationId || '';

      const candidateUserIds = await resolveCandidateUserIds(receiverId, receiverPhone);
      const tokens = await fetchTokensForCandidateUsers(candidateUserIds);

      console.log(`[API-FCM] Dispatching call ${callId} to ${tokens.length} token(s) for candidate users:`, candidateUserIds);

      if (tokens.length === 0) {
        return res.status(200).json({ success: false, sent: 0, failed: 0, reason: 'no_tokens' });
      }

      const accessToken = await getOAuth2AccessToken();
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
                      title: `📞 Incoming ${callType === 'video' ? 'Video' : 'Voice'} Call`,
                      body: `${callerName} is calling you on Chatr+...`,
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
                    title: `📞 Incoming ${callType === 'video' ? 'Video' : 'Voice'} Call`,
                    body: `${callerName} is calling you on Chatr+...`,
                    icon: callerAvatar || '/chatr-logo.png',
                    badge: '/chatr-logo.png',
                    requireInteraction: true,
                    tag: `incoming-call-${callId}`,
                  }
                } : {})
              },
              data: {
                type: 'call',
                call_id: callId,
                caller_id: callerId,
                caller_name: callerName,
                caller_avatar: callerAvatar,
                caller_phone: callerPhone,
                receiver_phone: receiverPhone,
                call_type: callType,
                is_video: callType === 'video' ? 'true' : 'false',
                conversation_id: conversationId,
                ringtone_sound: 'default',
                timestamp: Date.now().toString(),
              },
            },
          };

          const fcmRes = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          if (fcmRes.ok) {
            sent++;
          } else {
            failed++;
            const errText = await fcmRes.text();
            console.warn(`[API-FCM] FCM error for ${t.device_token.slice(0, 10)}: ${errText}`);
          }
        })
      );

      return res.status(200).json({ success: sent > 0, sent, failed });
    }

    // Message payload
    const recipientId = body.recipientId;
    const senderId = body.senderId || '';
    const senderName = body.senderName || 'Chatr+';
    const senderAvatar = body.senderAvatar || '';
    const conversationId = body.conversationId || '';
    const messageContent = body.messageContent || '';
    const messageId = body.messageId || ('msg_' + Date.now());

    const candidateUserIds = await resolveCandidateUserIds(recipientId);
    const tokens = await fetchTokensForCandidateUsers(candidateUserIds);

    if (tokens.length === 0) {
      return res.status(200).json({ success: false, sent: 0, failed: 0 });
    }

    const accessToken = await getOAuth2AccessToken();
    const endpoint = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;
    let sent = 0;
    let failed = 0;

    const truncated = messageContent && messageContent.length > 100
      ? messageContent.substring(0, 100) + '...'
      : (messageContent || 'Sent a message');

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
                    title: senderName,
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
                  title: senderName,
                  body: truncated,
                  icon: senderAvatar || '/chatr-logo.png',
                  badge: '/chatr-logo.png',
                  tag: conversationId || 'chatr-message',
                }
              } : {})
            },
            data: {
              type: 'chat_message',
              title: senderName,
              body: truncated,
              sender_id: senderId,
              sender_name: senderName,
              sender_avatar: senderAvatar,
              conversation_id: conversationId,
              message_id: messageId,
              timestamp: Date.now().toString(),
            },
          },
        };

        const fcmRes = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (fcmRes.ok) sent++;
        else failed++;
      })
    );

    return res.status(200).json({ success: sent > 0, sent, failed });

  } catch (err) {
    console.error('[API-FCM] Unhandled error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
