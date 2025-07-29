import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client with service role key for admin operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Create client with user's token to verify identity
    const userSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    // Verify the user's identity
    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    if (userError || !user) {
      console.error('User verification failed:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Deleting account for user: ${user.id}`);

    // Delete user data in proper order to avoid foreign key violations
    const userId = user.id;

    // 1. Delete voice message recipients
    const { error: recipientsError } = await supabase
      .from('voice_message_recipients')
      .delete()
      .eq('recipient_id', userId);

    if (recipientsError) {
      console.error('Error deleting recipients:', recipientsError);
    }

    // 2. Delete voice messages where user is sender
    const { error: messagesError } = await supabase
      .from('voice_messages')
      .delete()
      .eq('sender_id', userId);

    if (messagesError) {
      console.error('Error deleting messages:', messagesError);
    }

    // 3. Delete user nicknames
    const { error: nicknamesError } = await supabase
      .from('user_nicknames')
      .delete()
      .or(`assigner_id.eq.${userId},target_id.eq.${userId}`);

    if (nicknamesError) {
      console.error('Error deleting nicknames:', nicknamesError);
    }

    // 4. Delete profile
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('user_id', userId);

    if (profileError) {
      console.error('Error deleting profile:', profileError);
    }

    // 5. Delete user files from storage
    const { data: files } = await supabase.storage
      .from('voice-messages')
      .list(`${userId}/`);

    if (files && files.length > 0) {
      const filePaths = files.map(file => `${userId}/${file.name}`);
      const { error: storageError } = await supabase.storage
        .from('voice-messages')
        .remove(filePaths);

      if (storageError) {
        console.error('Error deleting storage files:', storageError);
      }
    }

    // 6. Finally, delete the auth user
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return new Response(JSON.stringify({ error: 'Failed to delete user account' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Successfully deleted account for user: ${userId}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in delete-account function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});