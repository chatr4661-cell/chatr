/**
 * CHATR OS - Core Operating System Layer
 * 
 * Main entry point for the CHATR OS infrastructure.
 * Initializes all core system services.
 * 
 * Week 1 - Foundation
 */

import { appLifecycleManager } from './kernel/AppLifecycleManager';
import { interAppCommunication } from './kernel/InterAppCommunication';
import { permissionManager } from './kernel/PermissionManager';

export { appLifecycleManager } from './kernel/AppLifecycleManager';
export { interAppCommunication } from './kernel/InterAppCommunication';
export { permissionManager } from './kernel/PermissionManager';

export * from './kernel/AppLifecycleManager';
export * from './kernel/InterAppCommunication';
export * from './kernel/PermissionManager';

/**
 * Initialize the CHATR OS
 * This should be called once when the app starts
 */
export async function initializeChatrOS() {
  console.log('');
  console.log('╔════════════════════════════════════════╗');
  console.log('║                                        ║');
  console.log('║     🚀 CHATR OS - Third OS Layer      ║');
  console.log('║          Initializing...               ║');
  console.log('║                                        ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');

  try {
    // Initialize core services in order
    await appLifecycleManager.initialize();
    await interAppCommunication.initialize();
    await permissionManager.initialize();

    console.log('');
    console.log('✅ CHATR OS successfully initialized');
    console.log('');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize CHATR OS:', error);
    return false;
  }
}

/**
 * Shutdown the CHATR OS
 * Cleanup all resources
 */
export function shutdownChatrOS() {
  console.log('🛑 Shutting down CHATR OS...');
  
  appLifecycleManager.destroy();
  interAppCommunication.destroy();
  permissionManager.destroy();
  
  console.log('✅ CHATR OS shutdown complete');
}
