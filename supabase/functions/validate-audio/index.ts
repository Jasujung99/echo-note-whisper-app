import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Magic numbers for audio file validation
const AUDIO_MAGIC_NUMBERS = {
  webm: [0x1A, 0x45, 0xDF, 0xA3], // WebM
  mp3: [0xFF, 0xFB], // MP3 frame sync
  wav: [0x52, 0x49, 0x46, 0x46], // RIFF header
  ogg: [0x4F, 0x67, 0x67, 0x53], // OggS
  m4a: [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70], // ftyp box
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_DURATION = 300; // 5 minutes in seconds

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const duration = parseFloat(formData.get('duration') as string);

    if (!audioFile) {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: 'No audio file provided' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate file size
    if (audioFile.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate duration
    if (duration > MAX_DURATION) {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: `Duration exceeds ${MAX_DURATION} seconds limit` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Read first few bytes to check magic numbers
    const arrayBuffer = await audioFile.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Check magic numbers for known audio formats
    let isValidAudio = false;
    for (const [format, magicBytes] of Object.entries(AUDIO_MAGIC_NUMBERS)) {
      if (bytes.length >= magicBytes.length) {
        const matches = magicBytes.every((byte, index) => bytes[index] === byte);
        if (matches) {
          isValidAudio = true;
          break;
        }
      }
    }

    // Additional WebM validation (check for audio tracks)
    if (audioFile.type === 'audio/webm') {
      const webmString = new TextDecoder().decode(bytes.slice(0, 1000));
      if (!webmString.includes('webm') && !webmString.includes('audio')) {
        isValidAudio = false;
      }
    }

    if (!isValidAudio) {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: 'Invalid audio file format or corrupted file' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Basic malicious payload detection
    const fileString = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 2048));
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /data:text\/html/i,
      /\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00/, // Null bytes pattern
      /\xDE\xAD\xBE\xEF/, // Common exploit pattern
    ];

    const hasSuspiciousContent = suspiciousPatterns.some(pattern => pattern.test(fileString));
    if (hasSuspiciousContent) {
      console.warn('Suspicious content detected in audio file');
      return new Response(JSON.stringify({ 
        valid: false, 
        error: 'File contains suspicious content' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      valid: true,
      fileSize: audioFile.size,
      duration: duration,
      type: audioFile.type
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in validate-audio function:', error);
    return new Response(JSON.stringify({ 
      valid: false, 
      error: 'Server error during validation' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});