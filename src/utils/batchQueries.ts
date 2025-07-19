import { supabase } from "@/integrations/supabase/client";

// Batch query for getting multiple nicknames at once - solving N+1 problem
export const getNicknamesForUsers = async (targetUserIds: string[]) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Map<string, string>();

  // Remove duplicates
  const uniqueUserIds = [...new Set(targetUserIds)];
  
  if (uniqueUserIds.length === 0) {
    return new Map<string, string>();
  }

  // Batch query for existing nicknames
  const { data: existingNicknames } = await supabase
    .from('user_nicknames')
    .select('target_id, nickname')
    .eq('assigner_id', user.id)
    .in('target_id', uniqueUserIds);

  const nicknameMap = new Map<string, string>();
  const existingMap = new Map<string, string>();

  // Map existing nicknames
  existingNicknames?.forEach(item => {
    existingMap.set(item.target_id, item.nickname);
    nicknameMap.set(item.target_id, item.nickname);
  });

  // Find users who need new nicknames
  const usersNeedingNicknames = uniqueUserIds.filter(id => !existingMap.has(id));

  if (usersNeedingNicknames.length > 0) {
    // Generate and batch insert new nicknames
    const { generateRandomNickname } = await import('./nicknameGenerator');
    const newNicknames = usersNeedingNicknames.map(targetId => ({
      assigner_id: user.id,
      target_id: targetId,
      nickname: generateRandomNickname()
    }));

    const { data: insertedNicknames, error } = await supabase
      .from('user_nicknames')
      .insert(newNicknames)
      .select('target_id, nickname');

    if (!error && insertedNicknames) {
      insertedNicknames.forEach(item => {
        nicknameMap.set(item.target_id, item.nickname);
      });
    } else {
      // Fallback for failed inserts
      usersNeedingNicknames.forEach(id => {
        nicknameMap.set(id, '익명의 사용자');
      });
    }
  }

  return nicknameMap;
};

// Batch query for getting multiple profiles at once
export const getProfilesForUsers = async (userIds: string[]) => {
  const uniqueUserIds = [...new Set(userIds)];
  
  if (uniqueUserIds.length === 0) {
    return new Map<string, any>();
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, username, avatar_url')
    .in('user_id', uniqueUserIds);

  const profileMap = new Map<string, any>();
  profiles?.forEach(profile => {
    profileMap.set(profile.user_id, profile);
  });

  return profileMap;
};

// Optimized query for voice messages with pagination
export const getVoiceMessagesWithPagination = async (
  limit: number = 20,
  offset: number = 0,
  messageType?: 'direct' | 'broadcast',
  userId?: string
) => {
  let query = supabase
    .from('voice_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (messageType) {
    query = query.eq('message_type', messageType);
  }

  if (userId && messageType === 'direct') {
    query = query.or(`sender_id.eq.${userId},recipient_id.eq.${userId}`);
  }

  return query;
};

// Optimized query for unread message counts
export const getUnreadMessageCounts = async (userId: string) => {
  const { data } = await supabase
    .from('voice_message_recipients')
    .select('message_id')
    .eq('recipient_id', userId)
    .is('listened_at', null);

  return data?.length || 0;
};