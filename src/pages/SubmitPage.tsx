import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { Button } from '../components/Button';
import Stepper from '../components/Stepper';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import NoticeBanner from '../components/NoticeBanner';
import { useSubmitInfo } from '../hooks/useSubmitInfo';

const steps = [
  { number: 1, title: '복사', description: '아래 의견서 내용을 복사해요.' },
  { number: 2, title: '사이트 이동', description: '공식 사이트에서 실명 확인해요.' },
  { number: 3, title: '붙여넣기', description: '의견 제출란에 붙여넣고 확인해요.' },
];

export default function SubmitPage() {
  const { id } = useParams<{ id: string }>();
  const { opinion, noticeCard, status, copied, copyDraft } = useSubmitInfo(id);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar mode="detail" />
      <div className="mx-auto w-full max-w-default px-10 pb-24 pt-20">
        {status === 'loading' && <LoadingState title="의견서를 불러오고 있어요" />}

        {status === 'error' && (
          <ErrorState
            eyebrow="연결 실패"
            title="의견서를 불러오지 못했어요"
            body="작성 중인 의견은 안전해요. 다시 시도해 주세요."
          />
        )}

        {status === 'success' && (
          <div className="flex flex-col gap-6">
            <p className="text-[13px] font-bold text-navy">초안 완성</p>
            <h1 className="text-[34px] font-bold leading-[1.35] text-ink">
              마지막 제출은 직접 해주세요
            </h1>
            <p className="max-w-[820px] text-[14px] leading-[1.7] text-muted">
              국회입법예고 사이트는 실명 인증이 필요한 공식 창구예요. 알법은 의견을 정리하고 절차를
              안내하지만, 대신 제출하지 않습니다.
            </p>

            <Stepper steps={steps} />

            <p className="mt-2 text-[19px] font-bold text-ink">제출할 의견서 미리보기</p>
            <div className="flex flex-col items-start gap-3 rounded-box bg-surface p-6">
              <p className="text-[13px] font-bold text-navy">
                {opinion?.stance ? `${opinion.stance} 의견` : '의견'} ·{' '}
                {opinion?.summary?.related_clause ?? noticeCard?.card.easy_title}
              </p>
              <p className="text-[14px] leading-[1.7] text-ink">
                {opinion?.draft_text ?? '작성한 의견서 내용이 여기에 표시돼요.'}
              </p>
              <Button variant="secondary" size="sm" onClick={copyDraft} className="mt-1 w-fit">
                {copied ? '복사됐어요' : '의견서 복사'}
              </Button>
            </div>

            <a
              href={noticeCard?.notice.source_url ?? 'https://pal.assembly.go.kr'}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-fit items-center justify-center rounded-btn bg-navy px-[22px] py-3.5 text-[14px] font-bold text-white transition-colors hover:bg-navy-soft"
            >
              국회입법예고 사이트로 이동
            </a>

            <NoticeBanner />

            <p className="text-[13px] font-medium text-navy">
              이동 후 내용과 제출 대상을 다시 확인하고 직접 제출합니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
