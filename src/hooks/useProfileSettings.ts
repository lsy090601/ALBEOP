import { useEffect, useState } from 'react';
import type { Profile } from '../types/database';
import { useDemoStore } from './useDemoStore';
import type { AsyncStatus } from './asyncStatus';

interface ProfileResponse {
  ok: boolean;
  profile: Profile;
  error?: string;
}

interface UseProfileSettingsResult {
  profile: Profile | null;
  status: AsyncStatus;
  reload: () => void;
  updateNotifyLimit: (limit: number) => Promise<void>;
  deleteAllData: () => Promise<void>;
  deleting: boolean;
  deleteError: string | null;
}

/**
 * 설정(P9) 데이터 로직: 실제 profiles를 조회하고, 알림 개수 변경과 데이터 전체 삭제를 담당한다.
 * (profiles는 RLS 때문에 브라우저에서 데모 페르소나를 직접 못 읽어 /api/profile이 대신 읽어준다)
 */
export function useProfileSettings(): UseProfileSettingsResult {
  const { currentProfileId, switchProfile } = useDemoStore();
  const [status, setStatus] = useState<AsyncStatus>('loading');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentProfileId) return;
    let cancelled = false;

    fetch(`/api/profile?profile_id=${encodeURIComponent(currentProfileId)}`)
      .then((res) => res.json() as Promise<ProfileResponse>)
      .then((json) => {
        if (cancelled) return;
        if (!json.ok) throw new Error(json.error);
        setProfile(json.profile);
        setStatus('success');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [currentProfileId, reloadKey]);

  async function updateNotifyLimit(limit: number) {
    if (!currentProfileId) return;
    const res = await fetch(`/api/profile?profile_id=${encodeURIComponent(currentProfileId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notify_limit_per_day: limit }),
    });
    const json = (await res.json()) as ProfileResponse;
    if (!res.ok || !json.ok) throw new Error(json.error ?? '저장에 실패했어요.');
    setProfile(json.profile);
  }

  async function deleteAllData() {
    if (!currentProfileId || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/profile?profile_id=${encodeURIComponent(currentProfileId)}`, {
        method: 'DELETE',
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? '삭제에 실패했어요.');
      switchProfile(null);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : '삭제 중 문제가 발생했어요.');
      throw e;
    } finally {
      setDeleting(false);
    }
  }

  return {
    profile,
    status,
    reload: () => setReloadKey((k) => k + 1),
    updateNotifyLimit,
    deleteAllData,
    deleting,
    deleteError,
  };
}
