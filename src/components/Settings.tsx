
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { LogOut, Volume2, VolumeX } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const Settings = () => {
  const [echoEnabled, setEchoEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('echo_enabled')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      
      if (data) {
        setEchoEnabled(data.echo_enabled ?? true);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const updateEchoSetting = async (enabled: boolean) => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert(
          { user_id: user.id, echo_enabled: enabled },
          { onConflict: 'user_id' }
        );

      if (error) throw error;

      setEchoEnabled(enabled);
      toast({
        title: "설정 저장됨",
        description: `메아리 기능이 ${enabled ? '활성화' : '비활성화'}되었습니다.`
      });
    } catch (error) {
      console.error('Error updating echo setting:', error);
      toast({
        title: "설정 오류",
        description: "설정을 저장할 수 없습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "로그아웃",
        description: "성공적으로 로그아웃되었습니다."
      });
    } catch (error) {
      toast({
        title: "로그아웃 오류",
        description: "로그아웃 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-xl font-bold mb-4">설정</h2>
      
      {/* Echo Setting */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {echoEnabled ? (
              <Volume2 className="w-5 h-5 text-primary" />
            ) : (
              <VolumeX className="w-5 h-5 text-muted-foreground" />
            )}
            <div>
              <h3 className="font-medium">메아리</h3>
              <p className="text-sm text-muted-foreground">
                내가 보낸 음성 메시지를 다른 사용자들에게 확산시킵니다
              </p>
            </div>
          </div>
          <Switch
            checked={echoEnabled}
            onCheckedChange={updateEchoSetting}
            disabled={loading}
          />
        </div>
      </Card>

      {/* User Info */}
      <Card className="p-4">
        <div className="space-y-2">
          <h3 className="font-medium">계정 정보</h3>
          <p className="text-sm text-muted-foreground">
            이메일: {user?.email}
          </p>
        </div>
      </Card>

      {/* Sign Out */}
      <Card className="p-4">
        <Button 
          variant="destructive" 
          onClick={handleSignOut}
          className="w-full flex items-center space-x-2"
        >
          <LogOut className="w-4 h-4" />
          <span>로그아웃</span>
        </Button>
      </Card>
    </div>
  );
};
