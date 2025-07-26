
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
    signOut,
  };
};
