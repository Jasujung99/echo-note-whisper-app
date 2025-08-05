
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    // 기본 검증
    if (!email || !email.includes('@') || email.length < 5) {
      return { error: { message: '유효한 이메일 주소를 입력해주세요' } };
    }
    if (!password || password.length < 6) {
      return { error: { message: '비밀번호는 최소 6자리 이상이어야 합니다' } };
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      return { error };
    } catch (err) {
      return { error: { message: '로그인에 실패했습니다. 다시 시도해주세요.' } };
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    // 이메일과 비밀번호 검증만 수행
    if (!email || !email.includes('@') || email.length < 5) {
      return { error: { message: '유효한 이메일 주소를 입력해주세요' } };
    }
    if (!password || password.length < 8) {
      return { error: { message: '비밀번호는 최소 8자리 이상이어야 합니다' } };
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return { error: { message: '비밀번호는 대문자, 소문자, 숫자를 각각 하나 이상 포함해야 합니다' } };
    }

    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            username: username.trim(),
          },
        },
      });
      return { error };
    } catch (err) {
      return { error: { message: '회원가입에 실패했습니다. 다시 시도해주세요.' } };
    }
  };

  const signInWithInviteCode = async (code: string) => {
    // 기본 검증
    if (!code || code.length < 6) {
      return { error: { message: '유효한 초청 코드를 입력해주세요' } };
    }

    try {
      // 초청 코드 검증
      const { data: inviteCode, error: fetchError } = await supabase
        .from('invite_codes')
        .select('*')
        .eq('code', code)
        .eq('is_used', false)
        .single();

      if (fetchError || !inviteCode) {
        return { error: { message: '유효하지 않거나 이미 사용된 초청 코드입니다' } };
      }

      // 임시 계정 생성
      const tempEmail = `invite_${code}@temp.local`;
      const tempPassword = `temp_${code}_${Date.now()}`;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: tempEmail,
        password: tempPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            username: inviteCode.nickname,
            is_invite_user: true,
            invite_code: code,
          },
        },
      });

      if (authError) {
        return { error: authError };
      }

      // 초청 코드를 사용됨으로 표시
      if (authData.user) {
        await supabase
          .from('invite_codes')
          .update({
            is_used: true,
            used_by: authData.user.id,
            used_at: new Date().toISOString(),
          })
          .eq('code', code);
      }

      return { error: null };
    } catch (err) {
      return { error: { message: '초청 코드 처리 중 오류가 발생했습니다. 다시 시도해주세요.' } };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signInWithInviteCode,
    signOut,
  };
};
