-- Create invite_codes table
CREATE TABLE public.invite_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read unused invite codes for validation" 
ON public.invite_codes 
FOR SELECT 
USING (is_used = false);

CREATE POLICY "Service role can manage invite codes" 
ON public.invite_codes 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_invite_codes_code ON public.invite_codes(code);
CREATE INDEX idx_invite_codes_used ON public.invite_codes(is_used);

-- Insert sample invite code
INSERT INTO public.invite_codes (code, nickname) 
VALUES ('735491639590', '활발한 나비');