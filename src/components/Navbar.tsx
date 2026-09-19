import { Link } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';

type NavActive = 'home' | 'voice' | 'notifications' | 'agent' | 'settings';

interface AppNavProps {
  mode?: 'app';
  active: NavActive;
  trailing?: string;
}

interface DetailNavProps {
  mode: 'detail';
}

interface MinimalNavProps {
  mode: 'minimal';
  title?: string;
}

interface LogoOnlyNavProps {
  mode: 'logo-only';
}

type NavbarProps = AppNavProps | DetailNavProps | MinimalNavProps | LogoOnlyNavProps;

const navLinks: { to: string; label: string; active: NavActive }[] = [
  { to: '/', label: '홈', active: 'home' },
  { to: '/my', label: '내 목소리', active: 'voice' },
  { to: '/notifications', label: '알림함', active: 'notifications' },
  { to: '/agent', label: '에이전트', active: 'agent' },
  { to: '/settings', label: '설정', active: 'settings' },
];

function NavLink({ to, label, isActive }: { to: string; label: string; isActive: boolean }) {
  return (
    <Link
      to={to}
      className={
        isActive ? 'text-[13px] font-bold text-navy' : 'text-[13px] font-medium text-muted'
      }
    >
      {label}
    </Link>
  );
}

export default function Navbar(props: NavbarProps) {
  const { unreadCount } = useNotifications();

  if (props.mode === 'detail') {
    return (
      <header className="flex h-[72px] w-full items-center justify-center gap-7 border border-border bg-white">
        <Link to="/" className="text-[20px] font-bold text-navy">
          알법
        </Link>
        <Link to="/" className="text-[13px] font-medium text-muted">
          홈으로 돌아가기
        </Link>
        <Link to="/my" className="text-[13px] font-medium text-muted">
          내 목소리
        </Link>
      </header>
    );
  }

  if (props.mode === 'minimal') {
    return (
      <header className="flex h-[72px] w-full items-center gap-[18px] border border-border bg-white px-14">
        <Link to="/" className="text-[20px] font-bold text-navy">
          알법
        </Link>
        {props.title && (
          <>
            <span className="text-muted">·</span>
            <span className="text-[13px] font-medium text-ink">{props.title}</span>
          </>
        )}
      </header>
    );
  }

  if (props.mode === 'logo-only') {
    return (
      <header className="flex h-[72px] w-full items-center justify-center border border-border bg-white">
        <Link to="/" className="text-[20px] font-bold text-navy">
          알법
        </Link>
      </header>
    );
  }

  const { active, trailing } = props;

  return (
    <header className="flex h-[72px] w-full items-center justify-center gap-7 border border-border bg-white">
      <Link to="/" className="text-[20px] font-bold text-navy">
        알법
      </Link>
      {navLinks.map((link) => (
        <span key={link.active} className="relative">
          <NavLink to={link.to} label={link.label} isActive={active === link.active} />
          {link.active === 'notifications' && unreadCount > 0 && (
            <span className="absolute -right-2.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-navy text-[9px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </span>
      ))}
      {trailing && <span className="text-[12px] font-medium text-muted">{trailing}</span>}
    </header>
  );
}
