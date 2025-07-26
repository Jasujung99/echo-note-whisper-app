-- Enable real-time for voice_message_recipients table
ALTER TABLE public.voice_message_recipients REPLICA IDENTITY FULL;

-- Add the table to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_message_recipients;