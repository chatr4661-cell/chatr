export type FacingMode = 'user' | 'environment';

/**
 * Best-effort camera picker for mobile devices.
 *
 * Notes:
 * - Device labels may be empty until AFTER camera permission is granted.
 * - When labels are empty, we rely on ordering heuristics (front usually first, back usually last).
 */
export async function pickCameraDeviceId(
  facingMode: FacingMode
): Promise<string | undefined> {
  try {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      return undefined;
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((d) => d.kind === 'videoinput');
    if (cameras.length === 0) return undefined;

    const patterns =
      facingMode === 'environment'
        ? ['back', 'rear', 'environment']
        : ['front', 'user', 'face'];

    const byLabel = cameras.find((d) => {
      const label = (d.label || '').toLowerCase();
      return patterns.some((p) => label.includes(p));
    });

    if (byLabel?.deviceId) return byLabel.deviceId;

    // If labels are empty, fall back to common ordering.
    return facingMode === 'environment'
      ? cameras[cameras.length - 1]?.deviceId
      : cameras[0]?.deviceId;
  } catch {
    return undefined;
  }
}
