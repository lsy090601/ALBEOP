import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useDemoStore } from '../hooks/useDemoStore';

/** 프로필이 없는 상태로 P2(홈) 외 페이지에 접근하면 /start로 돌려보낸다. */
export default function RequireProfile({ children }: { children: ReactNode }) {
  const { currentProfileId } = useDemoStore();
  if (!currentProfileId) return <Navigate to="/start" replace />;
  return children;
}
