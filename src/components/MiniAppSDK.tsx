import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MiniAppPermissions {
  storage: boolean;
  messaging: boolean;
  payments: boolean;
  notifications: boolean;
  camera: boolean;
  location: boolean;
}

interface MiniAppContext {
  appId: string;
  permissions: MiniAppPermissions;
  storage: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
    remove: (key: string) => Promise<void>;
  };
  messaging: {
    sendMessage: (userId: string, message: string) => Promise<void>;
  };
  payments: {
    requestPayment: (amount: number, description: string) => Promise<boolean>;
  };
  notifications: {
    send: (title: string, body: string) => Promise<void>;
  };
  user: {
    getId: () => Promise<string | null>;
    getProfile: () => Promise<any>;
  };
}

const MiniAppSDKContext = createContext<MiniAppContext | null>(null);

export const useMiniAppSDK = () => {
  const context = useContext(MiniAppSDKContext);
  if (!context) {
    throw new Error("useMiniAppSDK must be used within MiniAppSDKProvider");
  }
  return context;
};

interface MiniAppSDKProviderProps {
  appId: string;
  permissions: MiniAppPermissions;
  children: ReactNode;
}

export const MiniAppSDKProvider = ({ appId, permissions, children }: MiniAppSDKProviderProps) => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    loadUser();
  }, []);

  const storage = {
    get: async (key: string) => {
      if (!permissions.storage) {
        throw new Error("Storage permission not granted");
      }
      const storageKey = `miniapp_${appId}_${key}`;
      const value = localStorage.getItem(storageKey);
      return value ? JSON.parse(value) : null;
    },
    set: async (key: string, value: any) => {
      if (!permissions.storage) {
        throw new Error("Storage permission not granted");
      }
      const storageKey = `miniapp_${appId}_${key}`;
      localStorage.setItem(storageKey, JSON.stringify(value));
    },
    remove: async (key: string) => {
      if (!permissions.storage) {
        throw new Error("Storage permission not granted");
      }
      const storageKey = `miniapp_${appId}_${key}`;
      localStorage.removeItem(storageKey);
    },
  };

  const messaging = {
    sendMessage: async (recipientId: string, message: string) => {
      if (!permissions.messaging) {
        throw new Error("Messaging permission not granted");
      }
      if (!userId) {
        throw new Error("User not authenticated");
      }

      // Create or find conversation
      const { data: conversation, error: convError } = await supabase
        .rpc("create_direct_conversation", { other_user_id: recipientId });

      if (convError) throw convError;

      // Send message
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversation,
        sender_id: userId,
        content: message,
        message_type: "text",
      });

      if (error) throw error;
      toast.success("Message sent");
    },
  };

  const payments = {
    requestPayment: async (amount: number, description: string) => {
      if (!permissions.payments) {
        throw new Error("Payments permission not granted");
      }
      if (!userId) {
        throw new Error("User not authenticated");
      }

      // Check user balance
      const { data: balance } = await supabase
        .from("user_points")
        .select("balance")
        .eq("user_id", userId)
        .single();

      if (!balance || balance.balance < amount) {
        toast.error("Insufficient points");
        return false;
      }

      // Deduct points
      const { error } = await supabase
        .from("point_transactions")
        .insert({
          user_id: userId,
          amount: -amount,
          transaction_type: "spend",
          source: "mini_app",
          description: `${description} (${appId})`,
        });

      if (error) {
        toast.error("Payment failed");
        return false;
      }

      toast.success("Payment successful");
      return true;
    },
  };

  const notifications = {
    send: async (title: string, body: string) => {
      if (!permissions.notifications) {
        throw new Error("Notifications permission not granted");
      }
      toast(title, { description: body });
    },
  };

  const user = {
    getId: async () => userId,
    getProfile: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      return data;
    },
  };

  const contextValue: MiniAppContext = {
    appId,
    permissions,
    storage,
    messaging,
    payments,
    notifications,
    user,
  };

  return (
    <MiniAppSDKContext.Provider value={contextValue}>
      {children}
    </MiniAppSDKContext.Provider>
  );
};

// Example Mini App Component
export const ExampleMiniApp = () => {
  const sdk = useMiniAppSDK();
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Load saved count
    sdk.storage.get("count").then((value) => {
      if (value !== null) setCount(value);
    });
  }, []);

  const handleIncrement = async () => {
    const newCount = count + 1;
    setCount(newCount);
    await sdk.storage.set("count", newCount);
    await sdk.notifications.send("Counter Updated", `Count is now ${newCount}`);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Example Mini App</h2>
      <p className="text-lg mb-2">Count: {count}</p>
      <button
        onClick={handleIncrement}
        className="px-4 py-2 bg-primary text-white rounded-lg"
      >
        Increment
      </button>
    </div>
  );
};
