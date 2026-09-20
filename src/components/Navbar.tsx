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
  { to: '/', label: '오늘', active: 'home' },
  { to: '/my', label: '내 목소리', active: 'voice' },
  { to: '/notifications', label: '알림', active: 'notifications' },
  { to: '/agent', label: '에이전트', active: 'agent' },
  { to: '/settings', label: '설정', active: 'settings' },
];

const barClass =
  'sticky top-0 z-40 flex h-[72px] w-full items-center border-b border-border bg-white';
const innerClass = 'mx-auto flex w-full max-w-[1240px] items-center justify-between px-10';

/** 원형 심볼 + 워드마크 로고 */
function LogoMark() {
  return (
    <Link to="/" className="flex flex-col items-center gap-0.5" aria-label="알법 홈">
      <span className="flex size-6 items-center justify-center rounded-[50%_50%_50%_50%/60%_60%_40%_40%] border-[2.5px] border-navy" />
      <span className="text-[10px] font-bold leading-none text-navy">알법</span>
    </Link>
  );
}

function BackLink() {
  return (
    <Link to="/" className="text-[26px] leading-none text-ink" aria-label="뒤로 가기">
      ‹
    </Link>
  );
}

function NavLink({ to, label, isActive }: { to: string; label: string; isActive: boolean }) {
  return (
    <Link
      to={to}
      className={
        isActive
          ? 'text-[14px] font-bold text-navy'
          : 'text-[14px] font-medium text-faint transition-colors hover:text-muted'
      }
    >
      {label}
    </Link>
  );
}

function NavLinks({ active, trailing }: { active?: NavActive; trailing?: string }) {
  const { unreadCount } = useNotifications();

  return (
    <nav className="flex items-center gap-11">
      {navLinks.map((link) => (
        <span key={link.active} className="relative">
          <NavLink to={link.to} label={link.label} isActive={active === link.active} />
          {link.active === 'notifications' && unreadCount > 0 && (
            <span className="absolute -right-3 -top-1.5 flex size-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </span>
      ))}
      {trailing && <span className="text-[14px] font-medium text-faint">{trailing}</span>}
    </nav>
  );
}

export default function Navbar(props: NavbarProps) {
  if (props.mode === 'detail') {
    return (
      <header className={barClass}>
        <div className={innerClass}>
          <BackLink />
          <NavLinks />
        </div>
      </header>
    );
  }

  if (props.mode === 'minimal') {
    return (
      <header className={barClass}>
        <div className="flex w-full items-center gap-4 px-10">
          <Link to="/" className="text-[19px] font-bold text-navy">
            알법
          </Link>
          {props.title && (
            <>
              <span className="text-faint">·</span>
              <span className="text-[14px] font-medium text-ink">{props.title}</span>
            </>
          )}
        </div>
      </header>
    );
  }

  if (props.mode === 'logo-only') {
    return (
      <header className={barClass}>
        <div className="mx-auto flex items-center">
          <LogoMark />
        </div>
      </header>
    );
  }

  const { active, trailing } = props;

  return (
    <header className={barClass}>
      <div className={innerClass}>
        <LogoMark />
        <NavLinks active={active} trailing={trailing} />
      </div>
    </header>
  );
}
