-- Fix critical storage security vulnerabilities
-- Replace overly permissive storage policies with proper access control

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Anyone can view voice files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload voice files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete voice files" ON storage.objects;

-- Create secure storage policies for voice-messages bucket
-- Policy 1: Users can only view files from messages they have access to
CREATE POLICY "Users can view accessible voice files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'voice-messages' AND (
    -- User can view their own uploaded files
    auth.uid()::text = (storage.foldername(name))[1] OR
    -- User can view files from broadcast messages
    EXISTS (
      SELECT 1 FROM public.voice_messages vm 
      WHERE vm.audio_url = storage.objects.name 
      AND vm.is_broadcast = true
    ) OR
    -- User can view files from direct messages sent to them
    EXISTS (
      SELECT 1 FROM public.voice_messages vm 
      WHERE vm.audio_url = storage.objects.name 
      AND vm.message_type = 'direct' 
      AND vm.recipient_id = auth.uid()
    )
  )
);

-- Policy 2: Users can only upload to their own folder
CREATE POLICY "Users can upload their own voice files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'voice-messages' AND 
  auth.uid()::text = (storage.foldername(name))[1] AND
  -- Restrict file types to audio only
  (storage.extension(name) = ANY(ARRAY['mp3', 'wav', 'ogg', 'webm', 'm4a']))
);

-- Policy 3: Users can only delete their own files
CREATE POLICY "Users can delete their own voice files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'voice-messages' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 4: Users can only update their own files
CREATE POLICY "Users can update their own voice files" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'voice-messages' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Clean up existing usernames that don't match the new format
UPDATE public.profiles 
SET username = regexp_replace(username, '[^a-zA-Z0-9_-]', '', 'g')
WHERE username IS NOT NULL 
AND username !~ '^[a-zA-Z0-9_-]+$';

-- Ensure usernames meet minimum length after cleanup
UPDATE public.profiles 
SET username = username || '_user'
WHERE username IS NOT NULL 
AND length(username) < 2;

-- Add input validation constraints
-- Add check constraints for username length and format
ALTER TABLE public.profiles 
ADD CONSTRAINT username_length_check 
CHECK (username IS NULL OR (length(username) >= 2 AND length(username) <= 50));

ALTER TABLE public.profiles 
ADD CONSTRAINT username_format_check 
CHECK (username IS NULL OR username ~ '^[a-zA-Z0-9_-]+$');

-- Add constraints for voice message titles
ALTER TABLE public.voice_messages 
ADD CONSTRAINT title_length_check 
CHECK (title IS NULL OR length(title) <= 200);

-- Add constraints for duration (max 10 minutes = 600 seconds)
ALTER TABLE public.voice_messages 
ADD CONSTRAINT duration_check 
CHECK (duration > 0 AND duration <= 600);