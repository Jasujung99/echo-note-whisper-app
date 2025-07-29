
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DoorOpen, Speaker, VolumeX, Mail, MailX, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const Settings = () => {
  const [echoEnabled, setEchoEnabled] = useState(true);
  const [receiveMessages, setReceiveMessages] = useState(true);
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
        .select('echo_enabled, receive_messages')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      
      if (data) {
        setEchoEnabled(data.echo_enabled ?? true);
        setReceiveMessages(data.receive_messages ?? true);
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

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Use secure Edge Function for account deletion
      const { error } = await supabase.functions.invoke('delete-account', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });
      
      if (error) throw error;

      toast({
        title: "계정 삭제 완료",
        description: "계정이 성공적으로 삭제되었습니다."
      });
      
      // The Edge Function handles sign out automatically after deletion
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "계정 삭제 오류",
        description: "계정 삭제 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-xl font-bold mb-4">설정</h2>
      
      {/* Echo Setting */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {echoEnabled ? (
              <Speaker className="w-5 h-5 text-primary" />
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

      {/* Receive Messages Setting */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {receiveMessages ? (
              <Mail className="w-5 h-5 text-primary" />
            ) : (
              <MailX className="w-5 h-5 text-muted-foreground" />
            )}
            <div>
              <h3 className="font-medium">메시지 수신</h3>
              <p className="text-sm text-muted-foreground">
                새로운 메아리 메시지 알림을 받습니다
              </p>
            </div>
          </div>
          <Switch
            checked={receiveMessages}
            onCheckedChange={updateReceiveMessagesSetting}
            disabled={loading}
          />
        </div>
      </Card>

      {/* User Info */}
      <Card className="p-4 bg-card border-border">
        <div className="space-y-2">
          <h3 className="font-medium">계정 정보</h3>
          <p className="text-sm text-muted-foreground">
            이메일: {user?.email}
          </p>
        </div>
      </Card>

      {/* Sign Out */}
      <Card className="p-4 bg-card border-border">
        <Button 
          variant="secondary" 
          onClick={handleSignOut}
          className="w-full flex items-center space-x-2 bg-secondary hover:bg-secondary/90"
        >
          <DoorOpen className="w-4 h-4" />
          <span>로그아웃</span>
        </Button>
      </Card>

      {/* Delete Account */}
      <Card className="p-4 bg-card border-border">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="destructive" 
              className="w-full flex items-center space-x-2"
              disabled={loading}
            >
              <Trash2 className="w-4 h-4" />
              <span>계정 삭제</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>계정을 삭제하시겠습니까?</AlertDialogTitle>
              <AlertDialogDescription>
                이 작업은 되돌릴 수 없습니다. 계정과 모든 데이터가 영구적으로 삭제됩니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteAccount}
                className="bg-destructive hover:bg-destructive/90"
              >
                삭제
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    </div>
  );
};
