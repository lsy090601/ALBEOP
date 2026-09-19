import { useSyncExternalStore } from 'react';
import {
  advanceCommittee,
  advanceDay,
  getSnapshot,
  markNotificationRead,
  resetDemo,
  runAgentStep,
  subscribe,
  switchProfile,
  toggleCacheMode,
} from '../lib/demoStore';

/**
 * 데모 스토어(src/lib/demoStore.ts) 구독 훅.
 * 실제 서비스에서는 이 훅 내부를 Supabase 클라이언트 상태/쿼리로 교체한다.
 */
export function useDemoStore() {
  const state = useSyncExternalStore(subscribe, getSnapshot);

  return {
    ...state,
    switchProfile,
    toggleCacheMode,
    runAgentStep,
    advanceDay,
    advanceCommittee,
    markNotificationRead,
    resetDemo,
  };
}
