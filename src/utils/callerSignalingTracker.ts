/**
 * CHATR — Caller-Side Signaling Tracker
 *
 * Telemetry-only instrumentation that records, per callId, whether the
 * caller actually performed each outbound WebRTC step:
 *   1. Offer generation (createOffer + setLocalDescription)
 *   2. ICE gathering (candidate count + gathering-state transitions)
 *   3. send_signal (every webrtc_signals INSERT, success or failure)
 *
 * This directly answers the production question: "Did the caller's device
 * ever create and transmit an SDP offer and ICE candidates for this call?"
 *
 * STRICTLY additive. NEVER mutates the peer connection, signaling, or routing.
 * Inspect at runtime from the console:
 *   window.__chatrCaller()              -> all tracked calls
 *   window.__chatrCaller('<callId>')    -> one call's full timeline
 */

export type SignalKind = 'offer' | 'answer' | 'ice-candidate' | 'hangup' | string;

export interface SignalSendRecord {
  ts: number;
  type: SignalKind;
  ok: boolean;
  durationMs: number;
  error?: string;
}

export interface CallerSignalingRecord {
  callId: string;
  userId?: string;
  partnerId?: string;
  isInitiator?: boolean;
  createdAt: number;

  // Offer generation
  offerCreateStartedAt?: number;
  offerCreatedAt?: number;
  offerCreateError?: string;
  localDescriptionSetAt?: number;
  offerSentAt?: number;

  // ICE gathering
  iceGatheringStates: { ts: number; state: string }[];
  iceCandidatesGathered: number;
  iceCandidateTypes: Record<string, number>;
  iceGatheringCompleteAt?: number;

  // send_signal log (offers, answers, ice candidates, hangups)
  sends: SignalSendRecord[];
  sendCountsByType: Record<string, { ok: number; failed: number }>;
}

const MAX_SENDS = 200;
const records = new Map<string, CallerSignalingRecord>();

function getOrCreate(callId: string): CallerSignalingRecord {
  let rec = records.get(callId);
  if (!rec) {
    rec = {
      callId,
      createdAt: Date.now(),
      iceGatheringStates: [],
      iceCandidatesGathered: 0,
      iceCandidateTypes: {},
      sends: [],
      sendCountsByType: {},
    };
    records.set(callId, rec);
  }
  return rec;
}

const tag = (callId?: string) => `[CallerSig${callId ? ' ' + callId.slice(0, 8) : ''}]`;

export function initCallerTracking(
  callId: string,
  meta: { userId?: string; partnerId?: string; isInitiator?: boolean }
) {
  const rec = getOrCreate(callId);
  rec.userId = meta.userId;
  rec.partnerId = meta.partnerId;
  rec.isInitiator = meta.isInitiator;
  // eslint-disable-next-line no-console
  console.log(`${tag(callId)} tracking init`, {
    initiator: meta.isInitiator,
    user: meta.userId?.slice(0, 8),
    partner: meta.partnerId?.slice(0, 8),
  });
}

export function markOfferCreateStart(callId: string) {
  const rec = getOrCreate(callId);
  rec.offerCreateStartedAt = Date.now();
  // eslint-disable-next-line no-console
  console.log(`${tag(callId)} offer:create START`);
}

export function markOfferCreated(callId: string) {
  const rec = getOrCreate(callId);
  rec.offerCreatedAt = Date.now();
  const dt = rec.offerCreateStartedAt ? rec.offerCreatedAt - rec.offerCreateStartedAt : undefined;
  // eslint-disable-next-line no-console
  console.log(`${tag(callId)} offer:created (${dt ?? '?'}ms)`);
}

export function markOfferCreateError(callId: string, error: unknown) {
  const rec = getOrCreate(callId);
  rec.offerCreateError = error instanceof Error ? error.message : String(error);
  // eslint-disable-next-line no-console
  console.error(`${tag(callId)} offer:create FAILED`, rec.offerCreateError);
}

export function markLocalDescriptionSet(callId: string) {
  const rec = getOrCreate(callId);
  rec.localDescriptionSetAt = Date.now();
  // eslint-disable-next-line no-console
  console.log(`${tag(callId)} offer:setLocalDescription OK`);
}

export function markIceGatheringState(callId: string, state: string) {
  const rec = getOrCreate(callId);
  rec.iceGatheringStates.push({ ts: Date.now(), state });
  if (state === 'complete') rec.iceGatheringCompleteAt = Date.now();
  // eslint-disable-next-line no-console
  console.log(`${tag(callId)} ice:gatheringState=${state}`);
}

export function markIceCandidateGathered(callId: string, candidate: RTCIceCandidateInit) {
  const rec = getOrCreate(callId);
  rec.iceCandidatesGathered += 1;
  const type = parseCandidateType(candidate?.candidate);
  rec.iceCandidateTypes[type] = (rec.iceCandidateTypes[type] || 0) + 1;
  // Concise: log every 5th candidate to avoid spam, but always log first.
  if (rec.iceCandidatesGathered === 1 || rec.iceCandidatesGathered % 5 === 0) {
    // eslint-disable-next-line no-console
    console.log(`${tag(callId)} ice:gathered #${rec.iceCandidatesGathered} (${type})`);
  }
}

export function markIceGatheringComplete(callId: string) {
  const rec = getOrCreate(callId);
  rec.iceGatheringCompleteAt = Date.now();
  // eslint-disable-next-line no-console
  console.log(
    `${tag(callId)} ice:COMPLETE — gathered ${rec.iceCandidatesGathered} candidates`,
    rec.iceCandidateTypes
  );
}

export function markSignalSend(
  callId: string,
  type: SignalKind,
  ok: boolean,
  durationMs: number,
  error?: string
) {
  const rec = getOrCreate(callId);
  const entry: SignalSendRecord = { ts: Date.now(), type, ok, durationMs, error };
  rec.sends.push(entry);
  if (rec.sends.length > MAX_SENDS) rec.sends.shift();

  const counts = rec.sendCountsByType[type] || { ok: 0, failed: 0 };
  if (ok) counts.ok += 1;
  else counts.failed += 1;
  rec.sendCountsByType[type] = counts;

  if (type === 'offer' && ok) rec.offerSentAt = entry.ts;

  // eslint-disable-next-line no-console
  console.log(
    `${tag(callId)} send_signal ${type} ${ok ? 'OK' : 'FAILED'} (${durationMs}ms)`,
    error ?? ''
  );
}

/** One-line health verdict for a call — ideal for a quick log/dump. */
export function summarizeCall(callId: string): Record<string, unknown> | null {
  const rec = records.get(callId);
  if (!rec) return null;
  const offers = rec.sendCountsByType['offer'] || { ok: 0, failed: 0 };
  const ice = rec.sendCountsByType['ice-candidate'] || { ok: 0, failed: 0 };
  return {
    callId,
    isInitiator: rec.isInitiator,
    offerCreated: !!rec.offerCreatedAt,
    localDescriptionSet: !!rec.localDescriptionSetAt,
    offerCreateError: rec.offerCreateError,
    offersSent: offers.ok,
    offersFailed: offers.failed,
    iceCandidatesGathered: rec.iceCandidatesGathered,
    iceCandidateTypes: rec.iceCandidateTypes,
    iceCandidatesSent: ice.ok,
    iceCandidatesFailed: ice.failed,
    iceGatheringComplete: !!rec.iceGatheringCompleteAt,
    verdict:
      offers.ok > 0 && ice.ok > 0
        ? 'HEALTHY: offer + ICE transmitted'
        : offers.ok === 0
        ? 'BROKEN: no offer ever sent'
        : 'SUSPECT: offer sent but no ICE transmitted',
  };
}

export function getCallerSignalingRecord(callId: string): CallerSignalingRecord | undefined {
  return records.get(callId);
}

export function getAllCallerSignaling(): CallerSignalingRecord[] {
  return [...records.values()];
}

function parseCandidateType(candidate?: string): string {
  if (!candidate) return 'unknown';
  const m = /\btyp (\w+)/.exec(candidate);
  return m ? m[1] : 'unknown';
}

// Expose read-only inspection helpers to the console.
if (typeof window !== 'undefined') {
  (window as any).__chatrCaller = (callId?: string) =>
    callId ? summarizeCall(callId) ?? getCallerSignalingRecord(callId) : getAllCallerSignaling();
}
