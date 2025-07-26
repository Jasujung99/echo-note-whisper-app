
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
    // Input validation
    if (!email || !email.includes('@') || email.length < 5) {
      return { error: { message: 'Please enter a valid email address' } };
    }
    if (!password || password.length < 6) {
      return { error: { message: 'Password must be at least 6 characters long' } };
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      return { error };
    } catch (err) {
      return { error: { message: 'Sign in failed. Please try again.' } };
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    // Input validation for email and password only
    if (!email || !email.includes('@') || email.length < 5) {
      return { error: { message: 'Please enter a valid email address' } };
    }
    if (!password || password.length < 8) {
      return { error: { message: 'Password must be at least 8 characters long' } };
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return { error: { message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' } };
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
      return { error: { message: 'Sign up failed. Please try again.' } };
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
