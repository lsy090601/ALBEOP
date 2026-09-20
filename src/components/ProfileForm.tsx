import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './Button';
import Chip from './Chip';
import { useDemoStore } from '../hooks/useDemoStore';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database';

const AGE_GROUPS = ['10대', '20대', '30대 이상'] as const;
const ACTIVITIES = ['학생', '아르바이트', '정규직', '계약직', '프리랜서', '구직중'];
const HOUSING_TYPES = ['가족과 함께', '월세', '전세', '기숙사', '기타'];
const FINANCE_OPTIONS = ['학자금 대출', '청년 대출', '해당 없음'];
const INTERESTS = ['노동', '주거', '금융', '교육', '세금·보험'];

interface ProfileFormProps {
  /** 주어지면 수정 모드: 이 프로필 값으로 미리 채우고, 저장 시 /api/profile을 PATCH한다(P9).
   * 없으면 생성 모드(P1): 새 익명 세션을 만들고 그 본인 행에 upsert한다. */
  initialProfile?: Profile;
  /** 수정 모드에서 저장 성공 시 호출한다. 생성 모드는 대신 "/"로 이동한다. */
  onSaved?: () => void;
}

function Section({
  label,
  required,
  description,
  children,
}: {
  label: string;
  required?: boolean;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-border pt-6 first:border-t-0 first:pt-0">
      <div className="flex flex-col gap-1.5">
        <p className="text-[15px] font-bold text-ink">
          {label}
          {required && <span className="ml-1 text-navy">*</span>}
        </p>
        {description && <p className="text-[13px] leading-[1.6] text-muted">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function toggleInArray(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function ProfileForm({ initialProfile, onSaved }: ProfileFormProps) {
  const navigate = useNavigate();
  const { switchProfile } = useDemoStore();
  const isEditMode = !!initialProfile;

  const [ageGroup, setAgeGroup] = useState<(typeof AGE_GROUPS)[number] | null>(
    (initialProfile?.age_group as (typeof AGE_GROUPS)[number] | undefined) ?? null,
  );
  const [activities, setActivities] = useState<string[]>(initialProfile?.activities ?? []);
  const [weeklyHours, setWeeklyHours] = useState(
    initialProfile?.weekly_hours != null ? String(initialProfile.weekly_hours) : '',
  );
  const [housingType, setHousingType] = useState<string | null>(
    initialProfile?.housing_type ?? null,
  );
  const [housingContractPlan, setHousingContractPlan] = useState(
    initialProfile?.housing_contract_plan ?? false,
  );
  const [finance, setFinance] = useState<string[]>(initialProfile?.finance ?? []);
  const [interests, setInterests] = useState<string[]>(initialProfile?.interests ?? []);
  const [notifyTime, setNotifyTime] = useState(initialProfile?.notify_time?.slice(0, 5) ?? '20:00');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    ageGroup !== null && activities.length > 0 && housingType !== null && interests.length > 0;

  function toggleFinance(value: string) {
    if (value === '해당 없음') {
      setFinance((prev) => (prev.includes(value) ? [] : ['해당 없음']));
      return;
    }
    setFinance((prev) =>
      toggleInArray(
        prev.filter((v) => v !== '해당 없음'),
        value,
      ),
    );
  }

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);

    const fields = {
      age_group: ageGroup,
      activities,
      weekly_hours: weeklyHours ? Number(weeklyHours) : null,
      housing_type: housingType,
      housing_contract_plan: housingContractPlan,
      finance,
      interests,
      notify_time: notifyTime,
    };

    try {
      if (isEditMode && initialProfile) {
        // 수정 모드(P9): 데모 페르소나는 브라우저에 실제 로그인 세션이 없어(RLS가 막음)
        // 서비스 롤을 쓰는 /api/profile로 대신 저장한다.
        const res = await fetch(
          `/api/profile?profile_id=${encodeURIComponent(initialProfile.id)}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fields),
          },
        );
        const json = (await res.json()) as { ok: boolean; error?: string };
        if (!res.ok || !json.ok) throw new Error(json.error ?? '저장에 실패했어요.');
        onSaved?.();
        return;
      }

      const {
        data: { session: existingSession },
      } = await supabase.auth.getSession();

      let session = existingSession;
      if (!session) {
        const { data, error: authError } = await supabase.auth.signInAnonymously();
        if (authError) throw authError;
        session = data.session;
      }
      if (!session) throw new Error('로그인 세션을 만들지 못했어요.');

      const { error: upsertError } = await supabase.from('profiles').upsert({
        id: session.user.id,
        ...fields,
        difficulty: ageGroup === '10대' ? '쉬움' : '보통',
      });
      if (upsertError) throw upsertError;

      switchProfile(session.user.id);
      navigate('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 중 문제가 발생했어요. 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {!isEditMode && (
        <div className="flex flex-col gap-2.5 pb-2">
          <p className="text-[13px] font-bold text-navy">맞춤 설정 · 약 2분</p>
          <h1 className="text-[28px] font-bold leading-[1.35] text-ink">생활 조건을 알려주세요</h1>
          <p className="text-[14px] leading-[1.7] text-muted">
            법안과의 관련성을 판단하고 예상 영향을 계산하는 데만 사용합니다. 언제든 설정에서 바꿀 수
            있어요.
          </p>
        </div>
      )}

      <Section label="나이대" required>
        <div className="flex flex-wrap gap-2">
          {AGE_GROUPS.map((option) => (
            <Chip
              key={option}
              label={option}
              selected={ageGroup === option}
              onClick={() => setAgeGroup(option)}
            />
          ))}
        </div>
      </Section>

      <Section
        label="지금 하는 일"
        required
        description="여러 항목을 선택할 수 있어요. 시간제·계약직을 선택하면 계산에 필요한 항목이 이어집니다."
      >
        <div className="flex flex-wrap gap-2">
          {ACTIVITIES.map((option) => (
            <Chip
              key={option}
              label={option}
              selected={activities.includes(option)}
              onClick={() => setActivities((prev) => toggleInArray(prev, option))}
            />
          ))}
        </div>
      </Section>

      <Section label="주당 근무시간 (선택)">
        <input
          type="number"
          min={0}
          max={168}
          value={weeklyHours}
          onChange={(e) => setWeeklyHours(e.target.value)}
          placeholder="예: 15"
          className="w-36 rounded-btn border border-border px-4 py-2.5 text-[14px] text-ink outline-none focus:border-navy"
        />
      </Section>

      <Section label="사는 곳" required description="주거 지원 법안과의 관련성을 확인해요.">
        <div className="flex flex-wrap gap-2">
          {HOUSING_TYPES.map((option) => (
            <Chip
              key={option}
              label={option}
              selected={housingType === option}
              onClick={() => setHousingType(option)}
            />
          ))}
        </div>
      </Section>

      <label className="flex items-center gap-2.5 text-[14px] text-ink">
        <input
          type="checkbox"
          checked={housingContractPlan}
          onChange={(e) => setHousingContractPlan(e.target.checked)}
          className="size-[18px] accent-navy"
        />
        1년 안에 집 계약 예정
      </label>

      <Section label="금융 (선택)" description="해당하는 항목을 모두 선택하세요.">
        <div className="flex flex-wrap gap-2">
          {FINANCE_OPTIONS.map((option) => (
            <Chip
              key={option}
              label={option}
              selected={finance.includes(option)}
              onClick={() => toggleFinance(option)}
            />
          ))}
        </div>
      </Section>

      <Section label="관심 분야" required description="놓치고 싶지 않은 주제를 선택하세요.">
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((option) => (
            <Chip
              key={option}
              label={option}
              selected={interests.includes(option)}
              onClick={() => setInterests((prev) => toggleInArray(prev, option))}
            />
          ))}
        </div>
      </Section>

      <Section label="알림 시간">
        <input
          type="time"
          value={notifyTime}
          onChange={(e) => setNotifyTime(e.target.value)}
          className="w-36 rounded-btn border border-border px-4 py-2.5 text-[14px] text-ink outline-none focus:border-navy"
        />
      </Section>

      {error && <p className="text-[13px] text-red-600">{error}</p>}

      <Button
        variant="primary"
        size="md"
        fullWidth
        disabled={!canSubmit || submitting}
        onClick={handleSubmit}
        className="mt-2 py-4 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? '저장 중...' : isEditMode ? '저장하기' : '내 맞춤 알림 시작하기'}
      </Button>
    </div>
  );
}
