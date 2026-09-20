import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileForm from '../components/ProfileForm';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { Button } from '../components/Button';
import { useProfileSettings } from '../hooks/useProfileSettings';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { profile, status, reload, updateNotifyLimit, deleteAllData, deleting, deleteError } =
    useProfileSettings();

  const [savedMessage, setSavedMessage] = useState(false);
  const [notifyLimit, setNotifyLimit] = useState<number | null>(null);
  const [notifyLimitSaving, setNotifyLimitSaving] = useState(false);
  const [notifyLimitError, setNotifyLimitError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const effectiveNotifyLimit = notifyLimit ?? profile?.notify_limit_per_day ?? 2;

  function handleProfileSaved() {
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2000);
    reload();
  }

  async function handleSaveNotifyLimit() {
    setNotifyLimitSaving(true);
    setNotifyLimitError(null);
    try {
      await updateNotifyLimit(effectiveNotifyLimit);
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 2000);
    } catch (e) {
      setNotifyLimitError(e instanceof Error ? e.message : '저장에 실패했어요.');
    } finally {
      setNotifyLimitSaving(false);
    }
  }

  async function handleConfirmDelete() {
    try {
      await deleteAllData();
      navigate('/start');
    } catch {
      // deleteError는 훅에서 관리 — 모달에 그대로 표시한다.
    }
  }

  return (
    <>
      <div className="mx-auto flex w-full max-w-wide flex-col gap-5 px-10 pb-24 pt-20">
        <p className="text-[13px] font-bold text-navy">설정</p>
        <h1 className="text-[34px] font-bold leading-[1.3] text-ink">내 정보와 알림을 관리해요</h1>
        <p className="mb-2 text-[14px] leading-[1.7] text-muted">
          입력한 정보는 관련 법안을 찾고 영향 범위를 계산하는 데만 사용해요.
        </p>

        {status === 'loading' && <LoadingState title="내 정보를 불러오고 있어요" />}

        {status === 'error' && (
          <ErrorState
            eyebrow="연결 실패"
            title="내 정보를 불러오지 못했어요"
            body="다시 시도해 주세요."
            actionLabel="다시 시도하기"
            onAction={reload}
          />
        )}

        {status === 'success' && profile && (
          <>
            {savedMessage && (
              <p className="rounded-box bg-surface px-5 py-3 text-[13px] font-bold text-navy">
                저장됐어요
              </p>
            )}

            <div className="flex flex-col gap-5 rounded-card border border-border p-7">
              <p className="text-[17px] font-bold text-ink">프로필 정보</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: '지금 하는 일', value: profile.activities?.join(', ') },
                  { label: '나이대', value: profile.age_group },
                  {
                    label: '주당 근무 시간',
                    value: profile.weekly_hours ? `${profile.weekly_hours} 시간` : null,
                  },
                  { label: '주거 형태', value: profile.housing_type },
                  { label: '금융', value: profile.finance?.join(', ') },
                  { label: '관심 분야', value: profile.interests?.join(', ') },
                ].map((field) => (
                  <div
                    key={field.label}
                    className="flex flex-col gap-1.5 rounded-btn bg-surface-strong px-4 py-3.5"
                  >
                    <p className="text-[13px] font-bold text-ink">{field.label}</p>
                    <p className="text-[13px] text-muted">{field.value || '-'}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-5">
                <ProfileForm initialProfile={profile} onSaved={handleProfileSaved} />
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-card border border-border p-7">
              <p className="text-[17px] font-bold text-ink">알림 설정</p>
              <p className="text-[13px] leading-[1.7] text-muted">
                중요한 입법예고 소식을 놓치지 않도록 알려드려요.
              </p>
              <div className="flex items-end gap-3 border-t border-border pt-5">
                <label className="flex flex-col gap-2 text-[13px] font-bold text-ink">
                  하루 최대 알림 개수
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={effectiveNotifyLimit}
                    onChange={(e) => setNotifyLimit(Number(e.target.value))}
                    className="w-28 rounded-btn border border-border px-4 py-2.5 text-[14px] text-ink outline-none focus:border-navy"
                  />
                </label>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSaveNotifyLimit}
                  disabled={notifyLimitSaving}
                  className="w-fit"
                >
                  {notifyLimitSaving ? '저장 중...' : '저장'}
                </Button>
              </div>
              {notifyLimitError && <p className="text-[13px] text-red-600">{notifyLimitError}</p>}
            </div>

            <div className="flex flex-col gap-3 rounded-card border border-border p-7">
              <p className="text-[17px] font-bold text-ink">데이터 삭제</p>
              <p className="text-[13px] leading-[1.7] text-muted">
                내 프로필, 의견, 알림 데이터를 모두 지워요. 되돌릴 수 없어요.
              </p>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="mt-1 inline-flex w-fit items-center justify-center rounded-btn border border-red-600 bg-white px-[18px] py-2.5 text-[13px] font-bold text-red-600 transition-colors hover:bg-red-50"
              >
                내 데이터 전체 삭제
              </button>
            </div>
          </>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="flex w-[360px] max-w-full flex-col gap-4 rounded-xl bg-white p-6">
            <p className="text-[16px] font-bold text-ink">정말 삭제하시겠어요?</p>
            <p className="text-[13px] leading-[1.6] text-muted">
              프로필, 작성한 의견, 알림이 모두 사라지고 되돌릴 수 없어요.
            </p>
            {deleteError && <p className="text-[12px] text-red-600">{deleteError}</p>}
            <div className="flex justify-end gap-2.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                취소
              </Button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="inline-flex items-center justify-center rounded-[8px] border border-red-600 bg-red-600 px-4 py-[11px] text-[12px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {deleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
