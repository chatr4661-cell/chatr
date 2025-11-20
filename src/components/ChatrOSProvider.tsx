import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeChatrOS, shutdownChatrOS, appLifecycleManager, interAppCommunication, permissionManager } from '@/chatr-os';
import type { AppInfo } from '@/chatr-os/kernel/AppLifecycleManager';
import type { Permission } from '@/chatr-os/kernel/PermissionManager';

interface ChatrOSContextType {
  isInitialized: boolean;
  runningApps: AppInfo[];
  launchApp: (packageName: string) => Promise<void>;
  terminateApp: (appId: string) => Promise<void>;
  getRunningApps: () => AppInfo[];
  sendMessage: (targetApp: string, action: string, data?: any) => Promise<void>;
  requestPermission: (packageName: string, permission: Permission) => Promise<boolean>;
}

const ChatrOSContext = createContext<ChatrOSContextType>({
  isInitialized: false,
  runningApps: [],
  launchApp: async () => {},
  terminateApp: async () => {},
  getRunningApps: () => [],
  sendMessage: async () => {},
  requestPermission: async () => false,
});

export const useChatrOS = () => useContext(ChatrOSContext);

interface ChatrOSProviderProps {
  children: React.ReactNode;
}

export const ChatrOSProvider: React.FC<ChatrOSProviderProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [runningApps, setRunningApps] = useState<AppInfo[]>([]);

  useEffect(() => {
    const init = async () => {
      const success = await initializeChatrOS();
      setIsInitialized(success);
      
      if (success) {
        // Update running apps list every 2 seconds
        const interval = setInterval(() => {
          const apps = appLifecycleManager.getRunningApps();
          setRunningApps(apps);
        }, 2000);

        return () => {
          clearInterval(interval);
          shutdownChatrOS();
        };
      }
    };

    init();
  }, []);

  const launchApp = async (packageName: string) => {
    const session = await appLifecycleManager.launchApp(packageName);
    if (session) {
      const apps = appLifecycleManager.getRunningApps();
      setRunningApps(apps);
    }
  };

  const terminateApp = async (appId: string) => {
    await appLifecycleManager.terminateApp(appId);
    const apps = appLifecycleManager.getRunningApps();
    setRunningApps(apps);
  };

  const getRunningApps = () => {
    return appLifecycleManager.getRunningApps();
  };

  const sendMessage = async (targetApp: string, action: string, data?: any) => {
    await interAppCommunication.sendMessage(targetApp, action, data);
  };

  const requestPermission = async (packageName: string, permission: Permission) => {
    const results = await permissionManager.requestPermissions(packageName, [permission]);
    return results.length > 0 && results[0].granted;
  };

  const value: ChatrOSContextType = {
    isInitialized,
    runningApps,
    launchApp,
    terminateApp,
    getRunningApps,
    sendMessage,
    requestPermission,
  };

  return (
    <ChatrOSContext.Provider value={value}>
      {children}
    </ChatrOSContext.Provider>
  );
};
