-- Step 1: Clean up duplicate triggers and add critical indexes for performance optimization

-- 1. Clean up any duplicate triggers first
DROP TRIGGER IF EXISTS on_broadcast_message_created ON public.voice_messages;
DROP TRIGGER IF EXISTS on_voice_message_created ON public.voice_messages;

-- 2. Recreate the correct trigger
CREATE TRIGGER on_voice_message_created
  AFTER INSERT ON public.voice_messages
  FOR EACH ROW EXECUTE FUNCTION public.distribute_broadcast_message();

-- 3. Add critical indexes for performance
-- These are the most important indexes based on query patterns

-- Index for recipient queries (most frequent)
CREATE INDEX IF NOT EXISTS idx_vmr_recipient_id 
  ON voice_message_recipients(recipient_id);

-- Index for message lookups
CREATE INDEX IF NOT EXISTS idx_vmr_message_id 
  ON voice_message_recipients(message_id);

-- Index for unread messages (very common query)
CREATE INDEX IF NOT EXISTS idx_vmr_unread 
  ON voice_message_recipients(recipient_id, listened_at) 
  WHERE listened_at IS NULL;

-- Index for message ordering (used in all lists)
CREATE INDEX IF NOT EXISTS idx_vm_created_at 
  ON voice_messages(created_at DESC);

-- Compound index for sender queries with type filtering
CREATE INDEX IF NOT EXISTS idx_vm_sender_type_created 
  ON voice_messages(sender_id, message_type, created_at DESC);

-- Index for user profile lookups (used in joins)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id 
  ON profiles(user_id);

-- Index for message type filtering
CREATE INDEX IF NOT EXISTS idx_vm_message_type 
  ON voice_messages(message_type);

-- Partial index for broadcast messages (most common type)
CREATE INDEX IF NOT EXISTS idx_vm_broadcast_created 
  ON voice_messages(created_at DESC) 
  WHERE is_broadcast = true;