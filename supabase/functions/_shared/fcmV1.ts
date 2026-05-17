/**
 * Shared FCM HTTP v1 helper.
 * Used by all push-sending edge functions. Legacy /fcm/send is dead.
 */

function base64UrlEncode(str: string): string {
  const b64 = btoa(str);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function createJWT(serviceAccount: any): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  };

  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const privateKey: string = serviceAccount.private_key;
  const pemContents = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');

  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(unsignedToken),
  );

  const signatureB64 = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
  return `${unsignedToken}.${signatureB64}`;
}

// In-memory token cache (per-isolate, ~50 min TTL)
let cachedToken: { token: string; exp: number; saKey: string } | null = null;

export async function getOAuth2AccessToken(serviceAccount: any): Promise<string> {
  const saKey = serviceAccount.client_email + ':' + serviceAccount.project_id;
  const now = Date.now();
  if (cachedToken && cachedToken.saKey === saKey && cachedToken.exp > now + 60_000) {
    return cachedToken.token;
  }
  const jwt = await createJWT(serviceAccount);
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OAuth2 token fetch failed: ${response.status} ${error}`);
  }
  const data = await response.json();
  cachedToken = { token: data.access_token, exp: now + 50 * 60_000, saKey };
  return data.access_token;
}

export function loadServiceAccount(): any {
  const json = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
  if (!json) throw new Error('FIREBASE_SERVICE_ACCOUNT secret not configured');
  return JSON.parse(json);
}

export function maskToken(token: string): string {
  return token.length > 16
    ? `${token.substring(0, 8)}...${token.substring(token.length - 8)}`
    : token;
}

export interface FcmSendResult {
  success: boolean;
  status: number;
  messageId?: string;
  error?: string;
  body: string;
  isUnregistered: boolean;
}

/**
 * Send a single FCM HTTP v1 message. Throws hard on transport errors.
 * Returns structured result for HTTP-level failures so caller can prune tokens.
 */
export async function sendFcmV1Message(opts: {
  projectId: string;
  accessToken: string;
  fcmToken: string;
  message: Record<string, any>;
  functionName: string;
}): Promise<FcmSendResult> {
  const { projectId, accessToken, fcmToken, message, functionName } = opts;
  const endpoint = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  const payload = {
    message: {
      token: fcmToken,
      ...message,
    },
  };

  const masked = maskToken(fcmToken);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = await response.text();
  const isUnregistered = body.includes('UNREGISTERED') || body.includes('NOT_FOUND') ||
    body.includes('registration-token-not-registered');

  if (!response.ok) {
    console.error(
      `[${functionName}][FCM-v1] FAIL status=${response.status} token=${masked} body=${body.substring(0, 400)}`,
    );
    return {
      success: false,
      status: response.status,
      error: `${response.status}: ${body}`,
      body,
      isUnregistered,
    };
  }

  let messageId: string | undefined;
  try {
    messageId = JSON.parse(body).name;
  } catch {
    /* ignore */
  }
  console.log(`[${functionName}][FCM-v1] OK status=${response.status} token=${masked} id=${messageId}`);
  return { success: true, status: response.status, messageId, body, isUnregistered };
}
