import { useState } from "react";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { VoiceMessageList } from "@/components/VoiceMessageList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mic, List } from "lucide-react";

interface VoiceMessage {
  id: string;
  blob: Blob;
  duration: number;
  timestamp: Date;
  title: string;
}

const Index = () => {
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [activeTab, setActiveTab] = useState("record");

  const handleMessageSaved = (message: VoiceMessage) => {
    setMessages(prev => [message, ...prev]);
    setActiveTab("messages");
  };

  const handleDeleteMessage = (id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-2xl p-4">
        {/* Header */}
        <div className="text-center py-6 border-b border-border/50 mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">음성 쪽지</h1>
          <p className="text-muted-foreground">간편하게 음성 메시지를 녹음하고 관리하세요</p>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="record" className="flex items-center space-x-2">
              <Mic className="w-4 h-4" />
              <span>녹음</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center space-x-2">
              <List className="w-4 h-4" />
              <span>메시지 ({messages.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* Record Tab */}
          <TabsContent value="record" className="mt-0">
            <VoiceRecorder onMessageSaved={handleMessageSaved} />
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="mt-0">
            <VoiceMessageList 
              messages={messages} 
              onDeleteMessage={handleDeleteMessage}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
