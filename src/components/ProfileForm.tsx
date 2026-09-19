import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './Button';
import Chip from './Chip';
import { useDemoStore } from '../hooks/useDemoStore';
import { supabase } from '../lib/supabase';

const AGE_GROUPS = ['10대', '20대', '30대 이상'] as const;
const ACTIVITIES = ['학생', '아르바이트', '정규직', '계약직', '프리랜서', '구직중'];
const HOUSING_TYPES = ['가족과 함께', '월세', '전세', '기숙사', '기타'];
const FINANCE_OPTIONS = ['학자금 대출', '청년 대출', '해당 없음'];
const INTERESTS = ['노동', '주거', '금융', '교육', '세금·보험'];

function Section({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[12px] font-bold text-ink">
        {label}
        {required && <span className="ml-1 text-navy">*</span>}
      </p>
      {children}
    </div>
  );
}

function toggleInArray(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function ProfileForm() {
  const navigate = useNavigate();
  const { switchProfile } = useDemoStore();

  const [ageGroup, setAgeGroup] = useState<(typeof AGE_GROUPS)[number] | null>(null);
  const [activities, setActivities] = useState<string[]>([]);
  const [weeklyHours, setWeeklyHours] = useState('');
  const [housingType, setHousingType] = useState<string | null>(null);
  const [housingContractPlan, setHousingContractPlan] = useState(false);
  const [finance, setFinance] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [notifyTime, setNotifyTime] = useState('20:00');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    ageGroup !== null && activities.length > 0 && housingType !== null && interests.length > 0;

  function toggleFinance(value: string) {
    if (value === '해당 없음') {
      setFinance((prev) => (prev.includes(value) ? [] : ['해당 없음']));
      return;
    }
    setFinance((prev) => toggleInArray(prev.filter((v) => v !== '해당 없음'), value));
  }

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
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
        age_group: ageGroup,
        activities,
        weekly_hours: weeklyHours ? Number(weeklyHours) : null,
        housing_type: housingType,
        housing_contract_plan: housingContractPlan,
        finance,
        interests,
        notify_time: notifyTime,
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
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 className="text-[22px] font-bold text-ink">간단한 상황을 알려주세요</h1>
        <p className="text-[13px] leading-[1.6] text-muted">
          입력한 내용은 관련 법안을 찾고 영향을 계산하는 데만 사용해요.
        </p>
      </div>

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

      <Section label="지금 하는 일" required>
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
          className="w-32 rounded-[8px] border border-border px-3 py-2 text-[13px] text-ink outline-none focus:border-navy"
        />
      </Section>

      <Section label="사는 곳" required>
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

      <label className="flex items-center gap-2 text-[13px] text-ink">
        <input
          type="checkbox"
          checked={housingContractPlan}
          onChange={(e) => setHousingContractPlan(e.target.checked)}
          className="h-4 w-4 accent-navy"
        />
        1년 안에 집 계약 예정
      </label>

      <Section label="금융 (선택)">
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

      <Section label="관심 분야" required>
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
          className="w-32 rounded-[8px] border border-border px-3 py-2 text-[13px] text-ink outline-none focus:border-navy"
        />
      </Section>

      {error && <p className="text-[12px] text-red-600">{error}</p>}

      <Button
        variant="primary"
        size="md"
        fullWidth
        disabled={!canSubmit || submitting}
        onClick={handleSubmit}
        className="disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? '저장 중...' : '시작하기'}
      </Button>
    </div>
  );
}
