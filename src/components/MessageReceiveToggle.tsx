
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Inbox, InboxX } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const MessageReceiveToggle = () => {
  const [receiveMessages, setReceiveMessages] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchReceiveMessagesSetting();
    }
  }, [user]);

  const fetchReceiveMessagesSetting = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('receive_messages')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      
      if (data) {
        setReceiveMessages(data.receive_messages ?? true);
      }
    } catch (error) {
      console.error('Error fetching receive messages setting:', error);
    }
  };

  const updateReceiveMessagesSetting = async (enabled: boolean) => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert(
          { user_id: user.id, receive_messages: enabled },
          { onConflict: 'user_id' }
        );

      if (error) throw error;

      setReceiveMessages(enabled);
      toast({
        title: "설정 저장됨",
        description: `메시지 수신이 ${enabled ? '활성화' : '비활성화'}되었습니다.`
      });
    } catch (error) {
      console.error('Error updating receive messages setting:', error);
      toast({
        title: "설정 오류",
        description: "설정을 저장할 수 없습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex items-center space-x-2">
      {receiveMessages ? (
        <Inbox className="w-5 h-5 text-primary" />
      ) : (
        <InboxX className="w-5 h-5 text-muted-foreground" />
      )}
      <Switch
        checked={receiveMessages}
        onCheckedChange={updateReceiveMessagesSetting}
        disabled={loading}
      />
    </div>
  );
};
