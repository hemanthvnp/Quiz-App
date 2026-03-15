import type { ReactNode } from 'react';

/* ------------------------------------------------------------------ */
/*  AppLayout — outer shell + background glow                         */
/* ------------------------------------------------------------------ */

interface AppLayoutProps {
  children: ReactNode;
  className?: string;
}

export function AppLayout({ children, className = '' }: AppLayoutProps) {
  return (
    <div className={`min-h-screen bg-[#0a0a0f] text-white ${className}`}>
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan-600/8 rounded-full blur-[100px] pointer-events-none" />
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AppHeader — sticky header bar                                     */
/* ------------------------------------------------------------------ */

interface AppHeaderProps {
  children: ReactNode;
  maxWidth?: string;
}

export function AppHeader({ children, maxWidth = 'max-w-5xl' }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl">
      <div className={`${maxWidth} mx-auto px-6 py-4`}>
        {children}
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  LoadingScreen — full-page spinner                                 */
/* ------------------------------------------------------------------ */

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-400">{message}</p>
      </div>
    </div>
  );
}
