
-- Update the distribute_broadcast_message function to handle duplicates
CREATE OR REPLACE FUNCTION public.distribute_broadcast_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
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
    )
    -- Avoid duplicates by checking if recipient already exists for this message
    AND NOT EXISTS (
      SELECT 1 FROM public.voice_message_recipients existing
      WHERE existing.message_id = NEW.id 
      AND existing.recipient_id = p.user_id
    );
  END IF;
  RETURN NEW;
END;
$$;
