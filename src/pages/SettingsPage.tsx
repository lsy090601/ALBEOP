import Navbar from '../components/Navbar';
import { useDemoStore } from '../hooks/useDemoStore';
import { getProfileById } from '../lib/mockData';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-3 last:border-b-0">
      <p className="text-[11px] font-bold text-muted">{label}</p>
      <p className="text-[14px] text-ink">{value}</p>
    </div>
  );
}

export default function SettingsPage() {
  const { currentProfileId, cacheMode } = useDemoStore();
  const profile = getProfileById(currentProfileId);

  return (
    <div className="min-h-screen bg-page">
      <Navbar mode="app" active="settings" />
      <div className="mx-auto flex w-[720px] max-w-full flex-col gap-[22px] bg-white pb-14 pt-11">
        <p className="text-[12px] font-bold text-navy">내 정보</p>
        <h1 className="text-[30px] font-bold text-ink">설정</h1>
        <p className="text-[14px] text-muted">
          입력한 정보는 관련 법안을 찾고 영향 범위를 계산하는 데만 사용해요.
        </p>

        {profile ? (
          <div className="flex flex-col rounded-xl border border-border px-5">
            <Field label="이름" value={profile.display_name ?? '-'} />
            <Field label="나이대" value={profile.age_group ?? '-'} />
            <Field label="활동" value={profile.activities?.join(', ') ?? '-'} />
            <Field
              label="주당 근무시간"
              value={profile.weekly_hours ? `${profile.weekly_hours}시간` : '-'}
            />
            <Field label="주거 형태" value={profile.housing_type ?? '-'} />
            <Field
              label="주거 계약 예정 (1년 이내)"
              value={profile.housing_contract_plan ? '예정 있음' : '예정 없음'}
            />
            <Field label="금융 상황" value={profile.finance?.join(', ') ?? '-'} />
            <Field label="관심 분야" value={profile.interests?.join(', ') ?? '-'} />
            <Field label="알림 시각" value={profile.notify_time} />
            <Field label="하루 알림 개수" value={`${profile.notify_limit_per_day}건`} />
          </div>
        ) : (
          <p className="text-[13px] text-muted">등록된 프로필이 없어요.</p>
        )}

        <div className="flex flex-col gap-1 rounded-lg bg-surface px-4 py-3 text-[12px] text-muted">
          <p>캐시 모드: {cacheMode ? 'ON (저장된 데이터만 사용)' : 'OFF'}</p>
          <p className="text-[11px]">
            이 화면은 조회 전용 데모예요. 실제 서비스에서는 이 값을 직접 수정해 profiles 테이블을
            업데이트할 수 있어요.
          </p>
        </div>
      </div>
    </div>
  );
}
