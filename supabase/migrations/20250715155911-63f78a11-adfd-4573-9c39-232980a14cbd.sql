
-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username TEXT,
  avatar_url TEXT,
  echo_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create voice messages table
CREATE TABLE public.voice_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  audio_url TEXT NOT NULL,
  duration INTEGER NOT NULL,
  title TEXT,
  is_broadcast BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create voice message recipients table (for tracking who received broadcast messages)
CREATE TABLE public.voice_message_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES public.voice_messages(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  listened_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, recipient_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_message_recipients ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for voice messages
CREATE POLICY "Users can view all broadcast messages" ON public.voice_messages FOR SELECT USING (is_broadcast = true);
CREATE POLICY "Users can view own messages" ON public.voice_messages FOR SELECT USING (auth.uid() = sender_id);
CREATE POLICY "Users can create own messages" ON public.voice_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can delete own messages" ON public.voice_messages FOR DELETE USING (auth.uid() = sender_id);

-- RLS Policies for recipients
CREATE POLICY "Users can view own received messages" ON public.voice_message_recipients FOR SELECT USING (auth.uid() = recipient_id);
CREATE POLICY "System can insert recipients" ON public.voice_message_recipients FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own recipient status" ON public.voice_message_recipients FOR UPDATE USING (auth.uid() = recipient_id);

-- Create storage bucket for voice files
INSERT INTO storage.buckets (id, name, public) VALUES ('voice-messages', 'voice-messages', true);

-- Storage policies
CREATE POLICY "Users can upload voice files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'voice-messages' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view voice files" ON storage.objects FOR SELECT USING (bucket_id = 'voice-messages');
CREATE POLICY "Users can delete own voice files" ON storage.objects FOR DELETE USING (bucket_id = 'voice-messages' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username)
  VALUES (new.id, new.raw_user_meta_data ->> 'username');
  RETURN new;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to distribute broadcast messages
CREATE OR REPLACE FUNCTION public.distribute_broadcast_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Only distribute if it's a broadcast message and sender has echo enabled
  IF NEW.is_broadcast = true THEN
    INSERT INTO public.voice_message_recipients (message_id, recipient_id)
    SELECT NEW.id, p.user_id
    FROM public.profiles p
    WHERE p.user_id != NEW.sender_id  -- Don't send to sender
    AND EXISTS (
      SELECT 1 FROM public.profiles sender_profile 
      WHERE sender_profile.user_id = NEW.sender_id 
      AND sender_profile.echo_enabled = true
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for distributing broadcast messages
CREATE TRIGGER on_broadcast_message_created
  AFTER INSERT ON public.voice_messages
  FOR EACH ROW EXECUTE PROCEDURE public.distribute_broadcast_message();
