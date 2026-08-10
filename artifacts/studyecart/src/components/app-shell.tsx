import { BarChart3, BookOpen, GraduationCap, LayoutDashboard, LogOut, Menu, UserRound, Users, X } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useState, type ReactNode } from 'react';

const nav = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/students', label: 'Students', icon: Users },
  { href: '/departments', label: 'Departments', icon: BarChart3 },
  { href: '/courses', label: 'Courses', icon: BookOpen },
  { href: '/attendance', label: 'Attendance', icon: GraduationCap },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem('studyecart_user') || '{"name":"Campus Admin","role":"Administrator"}');
  const logout = () => { localStorage.removeItem('studyecart_token'); localStorage.removeItem('studyecart_user'); window.location.href = '/login'; };
  return (
    <div className="app-shell">
      <aside className={`sidebar flex flex-col p-4 md:p-5 ${mobileOpen ? 'fixed inset-y-0 left-0 z-30' : ''}`}>
        <div className="mb-10 flex items-center gap-3 px-2">
          <img src={`${import.meta.env.BASE_URL}studyecart-logo.png`} alt="StudyEcart" className="h-10 w-10 shrink-0 rounded-full object-cover" />
          <div className="brand-copy"><div className="font-display text-base font-extrabold tracking-tight text-white">StudyEcart</div><div className="text-[10px] uppercase tracking-[.16em] text-[#8cb9aa]">Campus operations</div></div>
          <button className="ml-auto text-[#a6cabe] sm:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu" data-testid="button-close-menu"><X size={18} /></button>
        </div>
        <div className="eyebrow px-3 pb-3 text-[#6f9f90]">Workspace</div>
        <nav className="space-y-1">
          {nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${location === href || (href !== '/' && location.startsWith(href)) ? 'bg-[#2d705d] text-white shadow-sm' : 'text-[#a9cabe] hover:bg-[#1c5143] hover:text-white'}`} data-testid={`link-nav-${label.toLowerCase()}`}><Icon size={18} /><span className="nav-label">{label}</span></Link>)}
        </nav>
        <div className="mt-auto border-t border-[#2a5b4d] pt-4">
          <div className="flex items-center gap-3 rounded-xl bg-[#174a3d] p-2.5">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f2c98b] text-sm font-bold text-[#5f4029]">{user.name?.slice(0, 1) || 'A'}</div>
            <div className="profile-copy min-w-0 flex-1"><div className="truncate text-xs font-bold text-white">{user.name}</div><div className="text-[10px] text-[#87b6a6]">{user.role || 'Administrator'}</div></div>
            <button onClick={logout} className="text-[#8cb9aa] hover:text-white" aria-label="Sign out" data-testid="button-logout"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>
      <main className="main-pane">
        <header className="flex h-[76px] items-center justify-between border-b border-[#dce9e3] bg-[#f5faf7]/90 px-5 md:px-10">
          <button className="rounded-lg p-2 text-[#487267] hover:bg-[#e6f2ec] sm:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu" data-testid="button-open-menu"><Menu size={20} /></button>
          <div className="hidden items-center gap-2 text-xs font-semibold text-[#739086] sm:flex"><span className="h-2 w-2 rounded-full bg-[#77bf58]" /> All systems operational</div>
          <div className="ml-auto flex items-center gap-4"><div className="hidden text-right sm:block"><div className="text-xs font-bold text-[#1b4138]">{user.name}</div><div className="text-[11px] text-[#78948b]">{user.email || 'staff@studyecart.edu'}</div></div><div className="grid h-9 w-9 place-items-center rounded-full bg-[#d9eddf] text-[#1f604f]"><UserRound size={17} /></div></div>
        </header>
        {children}
      </main>
    </div>
  );
}