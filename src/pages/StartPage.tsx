import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { useDemoStore } from '../hooks/useDemoStore';
import { getProfiles } from '../lib/mockData';

const slides = [
  {
    title: '법은 멀리 있지 않아요',
    body: '매일 쏟아지는 입법예고를 에이전트가 대신 읽어요.',
  },
  {
    title: '내 상황에 맞는 변화만',
    body: '나이대·활동·주거·금융 조건을 대입해 진짜 관련 있는 법안만 골라줘요.',
  },
  {
    title: '의견도, 진행 상황도 함께',
    body: '대화로 의견을 정리하고, 제출 이후 법안이 어디까지 갔는지 계속 알려드려요.',
  },
];

export default function StartPage() {
  const navigate = useNavigate();
  const { switchProfile } = useDemoStore();
  const [step, setStep] = useState(0);
  const profiles = getProfiles();

  const isIntro = step < slides.length;

  function selectProfile(id: string) {
    switchProfile(id);
    navigate('/');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-page">
      <div className="flex w-[520px] max-w-full flex-col gap-6 rounded-2xl border border-border bg-white px-10 py-12">
        <p className="text-[20px] font-bold text-navy">알법</p>

        {isIntro ? (
          <>
            <div className="flex flex-col gap-2">
              <h1 className="text-[24px] font-bold text-ink">{slides[step].title}</h1>
              <p className="text-[14px] leading-[1.6] text-muted">{slides[step].body}</p>
            </div>

            <div className="flex items-center gap-1.5">
              {slides.map((slide, i) => (
                <span
                  key={slide.title}
                  className={`h-1.5 rounded-full transition-all ${
                    i === step ? 'w-6 bg-navy' : 'w-1.5 bg-border'
                  }`}
                />
              ))}
            </div>

            <div className="flex justify-end gap-2.5">
              {step > 0 && (
                <Button variant="secondary" size="sm" onClick={() => setStep((s) => s - 1)}>
                  이전
                </Button>
              )}
              <Button variant="primary" size="sm" onClick={() => setStep((s) => s + 1)}>
                {step === slides.length - 1 ? '내 상황 입력하기' : '다음'}
              </Button>
            </div>
          </>
        ) : (
          // TODO: 실제 자유 입력 프로필 폼(나이대/활동/근무시간/주거형태/주거계약예정/금융/관심분야/알림시간)은
          // 시간 남으면 추가 예정, 지금은 데모 페르소나 선택으로 대체
          <>
            <div className="flex flex-col gap-2">
              <h1 className="text-[22px] font-bold text-ink">간단한 상황을 알려주세요</h1>
              <p className="text-[13px] leading-[1.6] text-muted">
                데모에서는 준비된 두 프로필 중 하나로 시작해요. 실제 서비스에서는 직접 입력한 내용이
                profiles 테이블에 저장돼요.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {profiles.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => selectProfile(profile.id)}
                  className="flex flex-col gap-1 rounded-xl border border-border p-4 text-left hover:border-navy"
                >
                  <p className="text-[15px] font-bold text-ink">
                    {profile.display_name} · {profile.age_group}
                  </p>
                  <p className="text-[12px] text-muted">
                    {profile.activities?.join(', ')} · {profile.housing_type}
                  </p>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
