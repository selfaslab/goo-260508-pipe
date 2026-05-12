import type { JSX } from 'react';
import { NavLink } from 'react-router-dom';

const links: readonly { to: string; label: string; hint: string; icon: string }[] = [
  { to: '/', label: '대시보드', hint: '오늘의 파이프라인', icon: '🧪' },
  { to: '/papers', label: '논문 탐색', hint: 'PubMed & 저장함', icon: '📚' },
  { to: '/script', label: 'Shorts 스크립트', hint: '요약 → 대본', icon: '📺' },
  { to: '/settings', label: '설정', hint: '환경 변수 · 연결', icon: '🛠️' },
] satisfies Readonly<
  readonly { to: string; label: string; hint: string; icon: string }[]
>;

export function SidebarNav(): JSX.Element {
  return (
    <nav aria-label="주요 페이지" className="space-y-2">
      {links.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            [
              'block rounded-2xl border px-4 py-3 transition',
              isActive
                ? 'border-lab-300 bg-white shadow-soft ring-1 ring-teal-200/70'
                : 'border-transparent bg-white/55 hover:bg-white/90',
            ].join(' ')
          }
        >
          <div className="flex items-start gap-3">
            <div className="text-lg">{item.icon}</div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">{item.label}</div>
              <div className="text-xs text-slate-500">{item.hint}</div>
            </div>
          </div>
        </NavLink>
      ))}
    </nav>
  );
}
