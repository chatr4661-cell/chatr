// Small in-memory cache to pass a user-gesture-acquired MediaStream to the call UI.
// This prevents Android WebView/Chrome from throwing NotAllowedError/NotReadableError
// when getUserMedia is called later (outside the original click/gesture).

const streams = new Map<string, MediaStream>();

export function setPreCallMediaStream(callId: string, stream: MediaStream) {
  streams.set(callId, stream);
}

export function takePreCallMediaStream(callId: string): MediaStream | null {
  const stream = streams.get(callId) ?? null;
  streams.delete(callId);
  return stream;
}

export function clearPreCallMediaStream(callId: string) {
  const stream = streams.get(callId);
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    streams.delete(callId);
  }
}
