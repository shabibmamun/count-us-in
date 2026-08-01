'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import { useApp } from '@/context/AppContext';
import { 
  LayoutDashboard, 
  Receipt, 
  Wallet, 
  CalendarDays, 
  BarChart3, 
  Users, 
  Coins, 
  Lightbulb, 
  Settings, 
  Menu, 
  X, 
  LogOut,
  HelpCircle,
  FolderSync
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { 
    user, 
    currentWorkspace, 
    workspaces, 
    members,
    switchWorkspace, 
    logOut, 
    isFallbackMode,
    isConnectionError,
    isLoading
  } = useApp();
  
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showMoreMobile, setShowMoreMobile] = useState(false);
  const [showFallbackPill, setShowFallbackPill] = useState(true);

  // Authenticated route safety checks
  React.useEffect(() => {
    if (!isLoading && !isConnectionError) {
      if (!user) {
        router.push(`/login?next=${pathname}`);
      } else if (workspaces.length === 0) {
        router.push('/onboarding');
      }
    }
  }, [user, workspaces, isLoading, isConnectionError, router, pathname]);

  // Fail-closed secure error page
  if (isConnectionError) {
    return (
      <div className="min-h-screen bg-[#F7F4EC] flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="max-w-md bg-white border border-border p-8 rounded-[16px] shadow-lg space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-50 text-[#C85450] flex items-center justify-center mx-auto">
            <span className="text-xl font-bold">!</span>
          </div>
          <h2 className="text-lg font-bold text-[#073F3B]">Connection Error</h2>
          <p className="text-xs text-[#506A64] leading-relaxed">
            We’re unable to connect securely right now. Please try again shortly.
          </p>
        </div>
      </div>
    );
  }

  // Loading state Spinner
  if (isLoading || !user || (!currentWorkspace && workspaces.length > 0)) {
    return (
      <div className="min-h-screen bg-[#F7F4EC] flex flex-col items-center justify-center p-6 text-[#073F3B] select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#0AA99D]"></div>
          <p className="text-xs font-bold tracking-wider uppercase text-[#506A64]">Securing your session...</p>
        </div>
      </div>
    );
  }

  const isSolo = currentWorkspace?.type === 'solo';

  // Desktop Navigation Items
  const navItems = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Spending', href: '/dashboard/expenses', icon: Receipt },
    { name: 'Income', href: '/dashboard/income', icon: Wallet },
    { name: 'Our Plan', href: '/dashboard/plan', icon: CalendarDays },
    { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
    ...(!isSolo ? [{ name: 'Balance Up', href: '/dashboard/balance', icon: FolderSync }] : []),
    { name: 'Zakat', href: '/dashboard/zakat', icon: Coins },
    { name: 'Smart Guide', href: '/dashboard/smart-guide', icon: Lightbulb },
    ...(!isSolo ? [{ name: 'Members', href: '/dashboard/members', icon: Users }] : []),
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  // Mobile Navigation Bottom Items (Primary)
  const mobilePrimary = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Spending', href: '/dashboard/expenses', icon: Receipt },
    { name: 'Add', href: '/dashboard/expenses/add', icon: Wallet, highlight: true },
    { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
  ];

  const handleLogout = async () => {
    await logOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background md:flex-row text-foreground">
      <head>
        <title>Count Us In</title>
        <meta name="robots" content="noindex, nofollow" />
      </head>
      
      {/* Top banner removed as per redesign rules */}

      {/* Desktop Sidebar */}
      {/* Desktop Sidebar (272px wide, sticky layout) */}
      <aside className="hidden md:flex flex-col w-[272px] h-screen sticky top-0 bg-white border-r border-border shrink-0 select-none">
        {/* Brand Header */}
        <div className="pt-6 pb-4 px-6 border-b border-border flex items-center">
          <Logo className="h-[36px]" variant="horizontal" />
        </div>

        {/* Workspace Switcher */}
        {workspaces.length > 1 && (
          <div className="p-4 border-b border-border bg-background/50">
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Active Space</label>
            <select
              value={currentWorkspace?.id || ''}
              onChange={(e) => switchWorkspace(e.target.value)}
              className="w-full px-2 py-1.5 border border-border rounded-md bg-white text-xs font-semibold text-primary outline-hidden"
            >
              {workspaces.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} {w.type === 'solo' ? '(Private)' : '(Shared)'}
                </option>
              ))}
            </select>
          </div>
        )}

        <nav className="flex-1 px-4 py-6 space-y-2.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 h-11 px-3.5 text-sm font-semibold rounded-[10px] transition-all relative ${
                  isActive 
                    ? 'bg-[#E7F3EF] text-[#073F3B] border-l-[3px] border-[#0AA99D]' 
                    : 'text-[#506A64] hover:bg-muted-neutral hover:text-[#073F3B]'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-[#087F78]' : 'text-[#758A84]'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer profile area */}
        <div className="p-4 border-t border-border bg-[#F7F4EC]/40 flex items-center justify-between gap-3 text-xs select-none">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8.5 h-8.5 rounded-full bg-secondary border border-accent/20 text-[#073F3B] font-bold flex items-center justify-center shrink-0">
              {user?.display_name?.substring(0, 2).toUpperCase() || 'CU'}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-primary truncate leading-tight">{user?.display_name || 'Guest User'}</p>
              <p className="text-[10px] text-[#667A75] font-semibold mt-0.5 leading-none">
                {currentWorkspace?.type === 'solo' 
                  ? 'Personal space' 
                  : `${currentWorkspace?.name || 'Shared space'} · ${members.length} member${members.length === 1 ? '' : 's'}`}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 hover:bg-red-50 text-muted-foreground hover:text-destructive rounded-md transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden flex justify-between items-center bg-white py-3 px-4 border-b border-border select-none">
        <div className="flex items-center gap-2">
          <Logo className="h-7" variant="mobile" />
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile workspace selector */}
          {workspaces.length > 1 && (
            <select
              value={currentWorkspace?.id || ''}
              onChange={(e) => switchWorkspace(e.target.value)}
              className="px-2 py-1 border border-border rounded-md bg-white text-xs font-semibold text-primary outline-hidden"
            >
              {workspaces.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1 hover:bg-background rounded-md text-primary"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Fullscreen overlay menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-background z-40 flex flex-col pt-16 px-6">
          <nav className="flex-1 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 text-base font-semibold rounded-md transition-all ${
                    isActive 
                      ? 'bg-secondary text-primary' 
                      : 'text-muted-foreground hover:bg-background'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="py-6 border-t border-border flex justify-between items-center mb-16">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center">
                {user?.display_name?.substring(0, 2).toUpperCase() || 'U'}
              </div>
              <div>
                <p className="font-bold text-sm text-primary">{user?.display_name}</p>
                <p className="text-[10px] text-muted-foreground font-bold tracking-wider">
                  {currentWorkspace?.type === 'solo' 
                    ? 'Personal space' 
                    : `${currentWorkspace?.name || 'Shared space'} · ${members.length} member${members.length === 1 ? '' : 's'}`}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-destructive text-sm font-semibold rounded-md hover:bg-red-100"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Dashboard Main Workspace Area */}
      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto pb-20 md:pb-8 relative px-4 py-6 md:px-10 max-w-[1480px] mx-auto w-full">
        {children}
      </main>



      {/* Mobile Bottom Navigation Bar (Sticky Bottom) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border h-16 flex justify-around items-center px-2 z-30 shadow-lg">
        {mobilePrimary.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          if (item.highlight) {
            return (
              <Link
                key={item.name}
                href={item.href}
                className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-105 transition-transform -mt-5"
                title="Add Expense"
              >
                <Icon className="h-6 w-6" />
              </Link>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center w-16 h-full text-xs font-semibold transition-all ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className="h-5 w-5 mb-0.5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
        
        {/* 'More' button to trigger mobile sidebar */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center w-16 h-full text-xs font-semibold text-muted-foreground"
        >
          <Menu className="h-5 w-5 mb-0.5" />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}
