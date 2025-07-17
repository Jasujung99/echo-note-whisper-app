
-- Add message_type and recipient_id to voice_messages table
ALTER TABLE public.voice_messages 
ADD COLUMN message_type TEXT DEFAULT 'broadcast' CHECK (message_type IN ('broadcast', 'direct')),
ADD COLUMN recipient_id UUID REFERENCES auth.users;

-- Create user_nicknames table for storing assigned nicknames
CREATE TABLE public.user_nicknames (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assigner_id UUID NOT NULL REFERENCES auth.users,
  target_id UUID NOT NULL REFERENCES auth.users,
  nickname TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(assigner_id, target_id)
);

-- Enable RLS on user_nicknames
ALTER TABLE public.user_nicknames ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_nicknames
CREATE POLICY "Users can view nicknames they assigned" 
  ON public.user_nicknames 
  FOR SELECT 
  USING (auth.uid() = assigner_id);

CREATE POLICY "Users can create nicknames" 
  ON public.user_nicknames 
  FOR INSERT 
  WITH CHECK (auth.uid() = assigner_id);

CREATE POLICY "Users can update nicknames they assigned" 
  ON public.user_nicknames 
  FOR UPDATE 
  USING (auth.uid() = assigner_id);

-- Update voice_messages policies for direct messages
CREATE POLICY "Users can view direct messages sent to them" 
  ON public.voice_messages 
  FOR SELECT 
  USING (message_type = 'direct' AND auth.uid() = recipient_id);

-- Update the distribute_broadcast_message function to only handle broadcast messages
CREATE OR REPLACE FUNCTION public.distribute_broadcast_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Only distribute if it's a broadcast message and sender has echo enabled
  IF NEW.message_type = 'broadcast' AND NEW.is_broadcast = true THEN
    INSERT INTO public.voice_message_recipients (message_id, recipient_id)
    SELECT NEW.id, p.user_id
    FROM public.profiles p
    WHERE p.user_id != NEW.sender_id  -- Don't send to sender
    AND p.receive_messages = true     -- Only send to users who want to receive messages
    AND EXISTS (
      SELECT 1 FROM public.profiles sender_profile 
      WHERE sender_profile.user_id = NEW.sender_id 
      AND sender_profile.echo_enabled = true
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Create trigger for the updated function
DROP TRIGGER IF EXISTS on_voice_message_created ON public.voice_messages;
CREATE TRIGGER on_voice_message_created
  AFTER INSERT ON public.voice_messages
  FOR EACH ROW EXECUTE FUNCTION public.distribute_broadcast_message();
