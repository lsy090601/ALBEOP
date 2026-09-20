import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';

/** 경로 → 네비게이션 활성 항목. 라우트 자체는 App.tsx가 그대로 관리한다. */
const activeByPath: Record<string, 'home' | 'voice' | 'notifications' | 'agent' | 'settings'> = {
  '/': 'home',
  '/my': 'voice',
  '/notifications': 'notifications',
  '/agent': 'agent',
  '/settings': 'settings',
};

/** 앱 공통 화면(오늘/내 목소리/알림/에이전트/설정)에서 Navbar를 한 번만 렌더링한다. */
export default function AppLayout() {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-white">
      <Navbar mode="app" active={activeByPath[pathname] ?? 'home'} />
      <Outlet />
    </div>
  );
}
