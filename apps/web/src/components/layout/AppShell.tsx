import type { PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';

import { SidebarNav } from './SidebarNav';

export function AppShell(props: PropsWithChildren) {
  return (
    <div className="mx-auto flex min-h-screen max-w-[1200px] gap-8 px-4 py-10 md:px-8">
      <aside className="hidden w-[240px] shrink-0 md:block">
        <div className="sticky top-10 space-y-6">
          <div className="rounded-3xl border border-teal-100 bg-white/80 p-5 shadow-soft backdrop-blur">
            <Link
              to="/"
              className="-m-1 block rounded-2xl p-1 outline-none ring-offset-2 transition hover:bg-teal-50/60 focus-visible:ring-2 focus-visible:ring-teal-400"
              aria-label="대시보드(메인)으로 이동"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lab-100 text-xl">
                  <span aria-hidden="true">
                    🌵<span className="relative -top-1 text-lg">👓</span>
                  </span>
                </div>
                <div>
                  <div className="font-display text-lg font-semibold tracking-tight text-slate-900">
                    BrainBite
                  </div>
                  <div className="text-xs leading-snug text-slate-500">
                    미래 건강심리
                    <br />
                    논문 자동 연구실
                  </div>
                </div>
              </div>
            </Link>
          </div>
          <SidebarNav />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="mb-8 md:hidden">
          <div className="flex items-center justify-between rounded-3xl border border-teal-100 bg-white/80 px-5 py-4 shadow-soft backdrop-blur">
            <Link
              to="/"
              className="-m-1 flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-1 outline-none ring-offset-2 transition hover:bg-teal-50/60 focus-visible:ring-2 focus-visible:ring-teal-400"
              aria-label="대시보드(메인)으로 이동"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-lab-100 text-lg">
                <span aria-hidden="true">
                  🌵<span className="relative -top-1">👓</span>
                </span>
              </div>
              <div className="min-w-0">
                <div className="font-display text-lg font-semibold tracking-tight">BrainBite</div>
                <div className="text-xs text-slate-500">연구실 · MVP</div>
              </div>
            </Link>
          </div>
          <div className="mt-4 rounded-3xl border border-teal-100 bg-white/80 p-4 shadow-soft backdrop-blur md:hidden">
            <SidebarNav />
          </div>
        </header>
        <main className="space-y-6">{props.children}</main>
      </div>
    </div>
  );
}
