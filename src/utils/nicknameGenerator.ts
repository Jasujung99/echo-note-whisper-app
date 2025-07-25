
const adjectives = [
  "바다의", "숲속의", "하늘의", "별빛의", "달빛의", "노을의", "새벽의", "구름의",
  "바람의", "꽃향기의", "물결의", "산들의", "이슬의", "햇살의", "눈송이의", "봄날의",
  "가을의", "겨울의", "여름의", "조용한", "평화로운", "따뜻한", "시원한", "푸른",
  "황금의", "은빛의", "투명한", "부드러운", "고요한", "신비한", "아름다운"
];

const nouns = [
  "고래", "토끼", "나비", "새", "사슴", "여우", "곰", "늑대", "독수리", "비둘기",
  "거북이", "물고기", "돌고래", "펭귄", "사자", "호랑이", "코끼리", "기린", "판다", "다람쥐",
  "햄스터", "고양이", "강아지", "앵무새", "부엉이", "까마귀", "참새", "제비", "학", "백조",
  "장미", "튤립", "국화", "해바라기", "라일락"
];

export const generateRandomNickname = (): string => {
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${randomAdjective} ${randomNoun}`;
};

export const getNicknameForUser = async (targetUserId: string) => {
  const { supabase } = await import("@/integrations/supabase/client");
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return '익명의 사용자';

  // 기존 닉네임이 있는지 확인
  const { data: existingNickname } = await supabase
    .from('user_nicknames')
    .select('nickname')
    .eq('assigner_id', user.id)
    .eq('target_id', targetUserId)
    .single();

  if (existingNickname) {
    return existingNickname.nickname;
  }

  // 새 닉네임 생성 및 저장
  const newNickname = generateRandomNickname();
  const { error } = await supabase
    .from('user_nicknames')
    .insert({
      assigner_id: user.id,
      target_id: targetUserId,
      nickname: newNickname
    });

  if (error) {
    console.error('Error creating nickname:', error);
    return '익명의 사용자';
  }

  return newNickname;
};

// 본인의 고정 닉네임을 가져오는 함수 (프로필에서)
export const getMyNickname = async () => {
  const { supabase } = await import("@/integrations/supabase/client");
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return '익명의 사용자';

  try {
    // 프로필 테이블에서 고정된 닉네임 가져오기
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('user_id', user.id)
      .single();

    if (error || !profile?.username) {
      // 프로필이 없거나 닉네임이 없으면 랜덤 생성
      return generateRandomNickname();
    }

    return profile.username;
  } catch (error) {
    console.error('Error fetching user nickname:', error);
    return generateRandomNickname();
  }
};
