import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  url: string;
  title: string;
  is_active: boolean;
}

export function BrowserTabs() {
  const [tabs, setTabs] = useState<Tab[]>([
    { id: "1", url: "about:blank", title: "New Tab", is_active: true }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>("1");

  const createTab = () => {
    const newTab: Tab = {
      id: Date.now().toString(),
      url: "about:blank",
      title: "New Tab",
      is_active: true,
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
  };

  const closeTab = (tabId: string) => {
    const newTabs = tabs.filter(t => t.id !== tabId);
    if (newTabs.length === 0) {
      createTab();
    } else {
      setTabs(newTabs);
      if (activeTabId === tabId) {
        setActiveTabId(newTabs[0].id);
      }
    }
  };

  return (
    <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-t-lg overflow-x-auto">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-t-lg min-w-[150px] max-w-[200px] cursor-pointer",
            activeTabId === tab.id ? "bg-background" : "bg-muted/50 hover:bg-muted"
          )}
          onClick={() => setActiveTabId(tab.id)}
        >
          <span className="text-sm truncate flex-1">{tab.title || "New Tab"}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0"
            onClick={(e) => {
              e.stopPropagation();
              closeTab(tab.id);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
      
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={createTab}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
