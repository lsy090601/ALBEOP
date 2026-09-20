import { useState } from 'react';
import { Button } from '../components/Button';
import ProfileForm from '../components/ProfileForm';

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
  const [step, setStep] = useState(0);

  const isIntro = step < slides.length;

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-6 py-16">
      <div className="flex w-full max-w-[680px] flex-col gap-7 rounded-hero border border-border bg-white px-12 py-14 shadow-hero">
        <p className="text-[19px] font-bold text-navy">알법</p>

        {isIntro ? (
          <>
            <div className="flex flex-col gap-3">
              <h1 className="text-[28px] font-bold leading-[1.35] text-ink">{slides[step].title}</h1>
              <p className="text-[15px] leading-[1.7] text-muted">{slides[step].body}</p>
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
          <ProfileForm />
        )}
      </div>
    </div>
  );
}
