-- Enhance RLS policies for better security

-- Update voice_message_recipients insert policy to be more restrictive
DROP POLICY IF EXISTS "System can insert recipients" ON public.voice_message_recipients;

CREATE POLICY "Authenticated users can insert recipients for broadcast messages"
ON public.voice_message_recipients
FOR INSERT
TO authenticated
WITH CHECK (
  -- Only allow inserts for broadcast messages where the sender has echo enabled
  EXISTS (
    SELECT 1 FROM public.voice_messages vm
    INNER JOIN public.profiles p ON p.user_id = vm.sender_id
    WHERE vm.id = message_id 
    AND vm.is_broadcast = true 
    AND p.echo_enabled = true
  )
);

-- Add policy to prevent users from seeing voice messages they shouldn't
DROP POLICY IF EXISTS "Users can view all broadcast messages" ON public.voice_messages;

CREATE POLICY "Users can view broadcast messages they should receive"
ON public.voice_messages
FOR SELECT
TO authenticated
USING (
  (is_broadcast = true AND message_type = 'broadcast') OR
  (auth.uid() = sender_id) OR
  (message_type = 'direct' AND auth.uid() = recipient_id)
);

-- Add more restrictive policy for profiles to prevent unauthorized access
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view profiles with privacy controls"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Users can always see their own profile
  auth.uid() = user_id OR
  -- Users can see other profiles only if they have interacted (sent/received messages)
  EXISTS (
    SELECT 1 FROM public.voice_messages vm
    WHERE (vm.sender_id = auth.uid() AND vm.recipient_id = user_id) OR
          (vm.sender_id = user_id AND vm.recipient_id = auth.uid()) OR
          -- Or if they've assigned nicknames to each other
          EXISTS (
            SELECT 1 FROM public.user_nicknames un
            WHERE (un.assigner_id = auth.uid() AND un.target_id = user_id) OR
                  (un.assigner_id = user_id AND un.target_id = auth.uid())
          )
  )
);

-- Add rate limiting table for authentication attempts
CREATE TABLE IF NOT EXISTS public.auth_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL,
  email text,
  attempt_type text NOT NULL CHECK (attempt_type IN ('signin', 'signup', 'password_reset')),
  success boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on auth_attempts table
ALTER TABLE public.auth_attempts ENABLE ROW LEVEL SECURITY;

-- Only allow system/service role to insert auth attempts
CREATE POLICY "Service role can manage auth attempts"
ON public.auth_attempts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_auth_attempts_ip_time ON public.auth_attempts (ip_address, created_at);
CREATE INDEX IF NOT EXISTS idx_auth_attempts_email_time ON public.auth_attempts (email, created_at) WHERE email IS NOT NULL;

-- Add security logging table
CREATE TABLE IF NOT EXISTS public.security_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event_type text NOT NULL,
  event_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on security_logs
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can manage security logs
CREATE POLICY "Service role can manage security logs"
ON public.security_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Users can view their own security logs
CREATE POLICY "Users can view own security logs"
ON public.security_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_security_logs_user_time ON public.security_logs (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_security_logs_event_time ON public.security_logs (event_type, created_at);