import { supabaseAdmin } from './supabaseAdmin.ts';

export interface ProfileFields {
  age_group: string | null;
  activities: string[] | null;
  weekly_hours: number | null;
  housing_type: string | null;
  housing_contract_plan: boolean;
  finance: string[] | null;
  interests: string[] | null;
  notify_time: string;
  notify_limit_per_day: number;
}

export interface ProfileRow extends ProfileFields {
  id: string;
  difficulty: string | null;
  created_at: string;
}

/** profiles는 RLS(auth.uid()=id)로 anon 조회가 막혀 있어(데모 페르소나는 실제 로그인 세션이 없음)
 * 서비스 롤로 대신 읽고 쓴다. P1(ProfileForm 최초 생성)만 예외로, 그 세션 본인 행이라 직접 쓴다. */
export async function fetchProfile(profileId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .maybeSingle();
  if (error) throw new Error(`profiles 조회 실패: ${error.message}`);
  return data as ProfileRow | null;
}

export async function updateProfile(
  profileId: string,
  fields: Partial<ProfileFields>,
): Promise<ProfileRow> {
  const patch: Record<string, unknown> = { ...fields };
  if ('age_group' in fields) {
    patch.difficulty = fields.age_group === '10대' ? '쉬움' : '보통';
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(patch)
    .eq('id', profileId)
    .select('*')
    .single();
  if (error) throw new Error(`profiles 수정 실패: ${error.message}`);
  return data as ProfileRow;
}

/**
 * 본인 프로필 관련 데이터를 전부 지운다(계정 자체는 Supabase 익명 유저라 별도 탈퇴 없이
 * 데이터 행 삭제로 처리). card_impacts/notifications/opinions가 profiles를 참조하는 FK라
 * cascade 설정이 없어(0002/0005), 참조하는 쪽부터 먼저 지워야 profiles 삭제가 성공한다.
 */
export async function deleteProfileData(profileId: string): Promise<void> {
  const { error: impactError } = await supabaseAdmin
    .from('card_impacts')
    .delete()
    .eq('profile_id', profileId);
  if (impactError) throw new Error(`card_impacts 삭제 실패: ${impactError.message}`);

  const { error: notifError } = await supabaseAdmin
    .from('notifications')
    .delete()
    .eq('user_id', profileId);
  if (notifError) throw new Error(`notifications 삭제 실패: ${notifError.message}`);

  const { error: opinionError } = await supabaseAdmin
    .from('opinions')
    .delete()
    .eq('user_id', profileId);
  if (opinionError) throw new Error(`opinions 삭제 실패: ${opinionError.message}`);

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .delete()
    .eq('id', profileId);
  if (profileError) throw new Error(`profiles 삭제 실패: ${profileError.message}`);
}
