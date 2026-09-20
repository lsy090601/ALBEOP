import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
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
    <div className="min-h-screen bg-page">
      <Navbar mode="app" active="settings" />
      <div className="mx-auto flex w-[720px] max-w-full flex-col gap-[22px] bg-white pb-14 pt-11">
        <p className="text-[12px] font-bold text-navy">내 정보</p>
        <h1 className="text-[30px] font-bold text-ink">설정</h1>
        <p className="text-[14px] text-muted">
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
              <p className="rounded-lg bg-surface px-4 py-2.5 text-[12px] font-bold text-navy">
                저장됐어요
              </p>
            )}

            <div className="rounded-xl border border-border p-5">
              <p className="mb-4 text-[16px] font-bold text-ink">프로필 수정</p>
              <ProfileForm initialProfile={profile} onSaved={handleProfileSaved} />
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-border p-5">
              <p className="text-[16px] font-bold text-ink">알림 설정</p>
              <div className="flex items-center gap-3">
                <label className="flex flex-col gap-1 text-[12px] font-bold text-ink">
                  하루 최대 알림 개수
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={effectiveNotifyLimit}
                    onChange={(e) => setNotifyLimit(Number(e.target.value))}
                    className="w-24 rounded-[8px] border border-border px-3 py-2 text-[13px] text-ink outline-none focus:border-navy"
                  />
                </label>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSaveNotifyLimit}
                  disabled={notifyLimitSaving}
                  className="mt-5 w-fit"
                >
                  {notifyLimitSaving ? '저장 중...' : '저장'}
                </Button>
              </div>
              {notifyLimitError && (
                <p className="text-[12px] text-red-600">{notifyLimitError}</p>
              )}
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-border p-5">
              <p className="text-[16px] font-bold text-ink">데이터 삭제</p>
              <p className="text-[12px] leading-[1.6] text-muted">
                내 프로필, 의견, 알림 데이터를 모두 지워요. 되돌릴 수 없어요.
              </p>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex w-fit items-center justify-center rounded-[8px] border border-red-600 bg-white px-4 py-[11px] text-[12px] font-bold text-red-600 transition-opacity hover:bg-red-50"
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
    </div>
  );
}
