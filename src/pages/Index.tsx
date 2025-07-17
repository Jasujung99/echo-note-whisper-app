
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AuthForm } from "@/components/AuthForm";
import { MainRecorder } from "@/components/MainRecorder";
import { DirectMessageList } from "@/components/DirectMessageList";
import { ChatRoom } from "@/components/ChatRoom";
import { Settings } from "@/components/Settings";
import { BottomNav } from "@/components/BottomNav";
import { useLocation } from "react-router-dom";

const Index = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("home");
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg text-muted-foreground">로딩 중...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  // Check if we're in a chat room
  const isChatRoom = location.pathname.startsWith('/chat/');
  
  if (isChatRoom) {
    return <ChatRoom />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'messages':
        return <DirectMessageList />;
      case 'home':
        return (
          <div className="text-center py-6 border-b border-border/50 mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-2">음성 쪽지</h1>
            <p className="text-muted-foreground mb-8">모든 사용자에게 음성 메시지를 전송하세요</p>
            <MainRecorder />
          </div>
        );
      case 'settings':
        return <Settings />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto max-w-2xl">
        {renderContent()}
      </div>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
