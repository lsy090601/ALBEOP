export type AsyncStatus = 'loading' | 'success' | 'error';

const SIMULATED_DELAY_MS = 350;

/**
 * mockData.ts 대신 실제 Supabase/API 호출로 교체될 때도
 * 훅 내부의 이 지점만 바꾸면 되도록 지연을 흉내낸다.
 */
export function simulateFetch<T>(factory: () => T, delayMs = SIMULATED_DELAY_MS): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(factory()), delayMs);
  });
}
