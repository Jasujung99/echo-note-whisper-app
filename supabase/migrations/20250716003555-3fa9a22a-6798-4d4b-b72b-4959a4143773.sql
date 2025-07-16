
-- Add receive_messages column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN receive_messages BOOLEAN DEFAULT true;

-- Update existing users to have receive_messages enabled by default
UPDATE public.profiles 
SET receive_messages = true 
WHERE receive_messages IS NULL;
