/**
 * OEM Detection & Reliability Flags
 * Detects aggressive OEMs and provides hints for native shell behavior
 */

// ============================================
// TYPES
// ============================================

export interface OEMInfo {
  manufacturer: string;
  model: string;
  isAggressiveOEM: boolean;
  needsBatteryExemption: boolean;
  needsAutoStartPermission: boolean;
  needsBackgroundPermission: boolean;
  callReliabilityHint: 'high' | 'medium' | 'low';
  recommendFallbackUI: boolean;
  detectedIssues: string[];
}

export interface DeviceCapabilities {
  supportsCallKit: boolean;
  supportsTelecomManager: boolean;
  supportsBackgroundVoIP: boolean;
  supportsHighPriorityFCM: boolean;
  maxBackgroundTime: number; // in seconds, -1 for unlimited
}

// ============================================
// AGGRESSIVE OEM LIST
// ============================================

const AGGRESSIVE_OEMS: Record<string, {
  names: string[];
  severity: 'high' | 'medium' | 'low';
  issues: string[];
}> = {
  xiaomi: {
    names: ['xiaomi', 'redmi', 'poco', 'mi '],
    severity: 'high',
    issues: [
      'Aggressive battery optimization kills background apps',
      'MIUI restricts background services',
      'Auto-start permission required',
      'Lock recent apps to prevent kill',
    ],
  },
  oppo: {
    names: ['oppo', 'realme', 'oneplus'],
    severity: 'high',
    issues: [
      'ColorOS/OxygenOS limits background activity',
      'Auto-start permission needed',
      'Battery optimization exemption required',
      'App may be killed after screen off',
    ],
  },
  vivo: {
    names: ['vivo', 'iqoo'],
    severity: 'high',
    issues: [
      'FuntouchOS restricts background services',
      'Auto-start permission required',
      'High power consumption mode needed',
      'Background app management setting required',
    ],
  },
  huawei: {
    names: ['huawei', 'honor'],
    severity: 'high',
    issues: [
      'EMUI aggressively manages background apps',
      'Protected apps list required',
      'Battery optimization exemption needed',
      'May miss notifications when screen is off',
    ],
  },
  samsung: {
    names: ['samsung'],
    severity: 'medium',
    issues: [
      'One UI may limit background activity',
      'Battery optimization settings available',
      'Generally more permissive than Chinese OEMs',
    ],
  },
  meizu: {
    names: ['meizu'],
    severity: 'high',
    issues: [
      'Flyme OS restricts background services',
      'Auto-start permission required',
      'Battery optimization exemption needed',
    ],
  },
};

// ============================================
// DETECTION FUNCTIONS
// ============================================

/**
 * Detect OEM from user agent and device info
 */
export function detectOEM(): OEMInfo {
  const userAgent = navigator.userAgent.toLowerCase();
  const platform = navigator.platform?.toLowerCase() || '';
  
  // Try to get device info from Android bridge
  const androidDevice = (window as any).AndroidBridge?.getDeviceInfo?.();
  const manufacturer = androidDevice?.manufacturer?.toLowerCase() || '';
  const model = androidDevice?.model?.toLowerCase() || '';
  
  // Combine all detection sources
  const deviceString = `${userAgent} ${manufacturer} ${model}`.toLowerCase();
  
  let detectedOEM: string = 'unknown';
  let severity: 'high' | 'medium' | 'low' = 'low';
  let issues: string[] = [];
  
  // Check against known OEMs
  for (const [oemKey, oemData] of Object.entries(AGGRESSIVE_OEMS)) {
    for (const name of oemData.names) {
      if (deviceString.includes(name)) {
        detectedOEM = oemKey;
        severity = oemData.severity;
        issues = oemData.issues;
        break;
      }
    }
    if (detectedOEM !== 'unknown') break;
  }
  
  const isAggressiveOEM = severity === 'high' || severity === 'medium';
  
  return {
    manufacturer: manufacturer || detectedOEM,
    model: model || 'unknown',
    isAggressiveOEM,
    needsBatteryExemption: isAggressiveOEM,
    needsAutoStartPermission: severity === 'high',
    needsBackgroundPermission: severity === 'high',
    callReliabilityHint: severity === 'high' ? 'low' : severity === 'medium' ? 'medium' : 'high',
    recommendFallbackUI: severity === 'high',
    detectedIssues: issues,
  };
}

/**
 * Get device capabilities based on platform
 */
export function getDeviceCapabilities(): DeviceCapabilities {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isAndroid = /android/i.test(navigator.userAgent);
  const oemInfo = detectOEM();
  
  if (isIOS) {
    return {
      supportsCallKit: true,
      supportsTelecomManager: false,
      supportsBackgroundVoIP: true,
      supportsHighPriorityFCM: true,
      maxBackgroundTime: -1, // Unlimited with CallKit
    };
  }
  
  if (isAndroid) {
    return {
      supportsCallKit: false,
      supportsTelecomManager: true,
      supportsBackgroundVoIP: !oemInfo.isAggressiveOEM,
      supportsHighPriorityFCM: true,
      maxBackgroundTime: oemInfo.isAggressiveOEM ? 60 : 300, // 1 min for aggressive, 5 min for others
    };
  }
  
  // Web fallback
  return {
    supportsCallKit: false,
    supportsTelecomManager: false,
    supportsBackgroundVoIP: false,
    supportsHighPriorityFCM: false,
    maxBackgroundTime: 0,
  };
}

/**
 * Check if device needs special permission prompts
 */
export function shouldShowPermissionHelper(): boolean {
  const oemInfo = detectOEM();
  return oemInfo.isAggressiveOEM && (
    oemInfo.needsBatteryExemption ||
    oemInfo.needsAutoStartPermission ||
    oemInfo.needsBackgroundPermission
  );
}

/**
 * Get permission help text based on OEM
 */
export function getOEMPermissionHelp(): { title: string; steps: string[] } | null {
  const oemInfo = detectOEM();
  
  if (!oemInfo.isAggressiveOEM) return null;
  
  const manufacturer = oemInfo.manufacturer.toLowerCase();
  
  if (manufacturer.includes('xiaomi') || manufacturer.includes('redmi') || manufacturer.includes('poco')) {
    return {
      title: 'Enable Background Access (Xiaomi/MIUI)',
      steps: [
        'Open Settings > Apps > Manage Apps',
        'Find CHATR and tap on it',
        'Enable "Autostart"',
        'Under "Battery saver", select "No restrictions"',
        'Lock CHATR in recent apps by swiping down on its card',
      ],
    };
  }
  
  if (manufacturer.includes('oppo') || manufacturer.includes('realme')) {
    return {
      title: 'Enable Background Access (OPPO/Realme)',
      steps: [
        'Open Settings > Battery > App launch management',
        'Find CHATR and disable "Manage automatically"',
        'Enable all three options: Auto-launch, Secondary launch, Run in background',
        'Go back and ensure CHATR is not in "Power saving" mode',
      ],
    };
  }
  
  if (manufacturer.includes('oneplus')) {
    return {
      title: 'Enable Background Access (OnePlus)',
      steps: [
        'Open Settings > Battery > Battery optimization',
        'Tap "Not optimized" dropdown and select "All apps"',
        'Find CHATR and select "Don\'t optimize"',
        'Also check Settings > Apps > App management > CHATR > Allow auto-launch',
      ],
    };
  }
  
  if (manufacturer.includes('vivo') || manufacturer.includes('iqoo')) {
    return {
      title: 'Enable Background Access (Vivo/iQOO)',
      steps: [
        'Open Settings > Battery > Background power consumption management',
        'Find CHATR and enable "Allow background activity"',
        'Also enable "Auto-start" in Settings > More settings > Permissions',
        'Set CHATR to "High power consumption" mode if available',
      ],
    };
  }
  
  if (manufacturer.includes('huawei') || manufacturer.includes('honor')) {
    return {
      title: 'Enable Background Access (Huawei/Honor)',
      steps: [
        'Open Settings > Battery > App launch',
        'Find CHATR and disable "Manage automatically"',
        'Enable all three options manually',
        'Add CHATR to "Protected apps" in battery settings',
      ],
    };
  }
  
  if (manufacturer.includes('samsung')) {
    return {
      title: 'Optimize Background Access (Samsung)',
      steps: [
        'Open Settings > Apps > CHATR > Battery',
        'Select "Unrestricted" or disable "Put app to sleep"',
        'Also check Settings > Battery > Background usage limits',
        'Remove CHATR from "Sleeping apps" list if present',
      ],
    };
  }
  
  // Generic Android help
  return {
    title: 'Enable Background Access',
    steps: [
      'Open Settings > Apps > CHATR',
      'Tap on Battery and disable optimization',
      'Enable "Allow background activity" if available',
      'Check for any auto-start or background app management settings',
    ],
  };
}

/**
 * Expose OEM info to native shell
 */
export function exposeOEMToNative(): void {
  const oemInfo = detectOEM();
  const capabilities = getDeviceCapabilities();
  
  // Expose to Android via bridge
  if ((window as any).AndroidBridge?.setOEMInfo) {
    (window as any).AndroidBridge.setOEMInfo(JSON.stringify({
      ...oemInfo,
      capabilities,
    }));
  }
  
  // Expose to iOS via message handler
  if ((window as any).webkit?.messageHandlers?.oemInfo) {
    (window as any).webkit.messageHandlers.oemInfo.postMessage({
      ...oemInfo,
      capabilities,
    });
  }
  
  // Store in window for debugging
  (window as any).__CHATR_OEM_INFO__ = { oemInfo, capabilities };
  
  console.log('[OEM] Detection complete:', oemInfo.manufacturer, 
    'Aggressive:', oemInfo.isAggressiveOEM,
    'Reliability:', oemInfo.callReliabilityHint);
}

/**
 * Request battery optimization exemption via native bridge
 */
export async function requestBatteryExemption(): Promise<boolean> {
  try {
    const AndroidBridge = (window as any).AndroidBridge;
    if (AndroidBridge?.requestBatteryOptimizationExemption) {
      await AndroidBridge.requestBatteryOptimizationExemption();
      return true;
    }
    return false;
  } catch (error) {
    console.error('[OEM] Battery exemption request failed:', error);
    return false;
  }
}

/**
 * Open OEM-specific settings page
 */
export function openOEMSettings(): void {
  try {
    const AndroidBridge = (window as any).AndroidBridge;
    if (AndroidBridge?.openBatterySettings) {
      AndroidBridge.openBatterySettings();
    } else if (AndroidBridge?.openAppSettings) {
      AndroidBridge.openAppSettings();
    }
  } catch (error) {
    console.error('[OEM] Failed to open settings:', error);
  }
}
