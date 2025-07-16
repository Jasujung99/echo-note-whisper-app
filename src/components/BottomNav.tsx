
import { Mail, Radio, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  const { unreadCount } = useUnreadMessages();
  
  const tabs = [
    { id: 'messages', icon: Mail, label: '메시지' },
    { id: 'home', icon: Radio, label: '홈' },
    { id: 'settings', icon: SlidersHorizontal, label: '설정' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border/50">
      <div className="flex justify-around items-center py-2 px-4 max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <Button
              key={tab.id}
              variant="ghost"
              size="sm"
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center space-y-1 h-auto py-2 px-3 ${
                isActive 
                  ? 'text-primary bg-secondary/20' 
                  : 'text-muted-foreground hover:text-secondary hover:bg-secondary/10'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
              <span className="text-xs">{tab.label}</span>
              
              {/* Unread message badge */}
              {tab.id === 'messages' && unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
};
