import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../features/auth/api';
import { queryClient } from '@/app/queryClient';
import { AUTH_QUERY_KEY } from '@/features/auth/constants';
import { useAuth } from '@/features/auth/useAuth';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { ThemeSettingsDrawer } from '@/components/theme/theme-settings';
import { TooltipProvider, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui';
import { LayoutDashboard, Boxes, ClipboardCheck, FileText, Clock, QrCode, Printer, Database, Users, ShieldCheck, CalendarDays, Building2, LogOut, ChevronLeft, Menu, Bell, Settings, type LucideIcon } from 'lucide-react';

interface NavItem { path: string; label: string; icon: LucideIcon; permissions: string[]; }
interface NavGroup { title: string; items: NavItem[]; }

const NAV_GROUPS: NavGroup[] = [
  { title: 'Home', items: [{ path: '/', label: 'Dashboard', icon: LayoutDashboard, permissions: ['dashboard.view'] }] },
  { title: 'Operasional', items: [{ path: '/inventory', label: 'Inventaris', icon: Boxes, permissions: ['inventory.view'] }, { path: '/compliance', label: 'Pelaksanaan Checklist', icon: ClipboardCheck, permissions: ['compliance.view', 'compliance.execute'] }] },
  { title: 'Compliance', items: [{ path: '/checklist/templates', label: 'Checklist Master', icon: FileText, permissions: ['checklist_template.view'] }, { path: '/checklist/sessions', label: 'Sesi Checklist', icon: Clock, permissions: ['checklist_session.view'] }] },
  { title: 'Data', items: [{ path: '/master-data', label: 'Master Data', icon: Database, permissions: ['master.area.view', 'master.category.view', 'master.item_type.view', 'master.area.manage', 'master.category.manage', 'master.item_type.manage'] }] },
  { title: 'Reporting', items: [{ path: '/qr', label: 'QR Center', icon: QrCode, permissions: ['qr.view'] }, { path: '/reports', label: 'Print Center', icon: Printer, permissions: ['reports.view'] }] },
  { title: 'Administration', items: [{ path: '/users', label: 'Pengguna', icon: Users, permissions: ['users.view'] }, { path: '/roles', label: 'Role & Permission', icon: ShieldCheck, permissions: ['roles.view'] }] },
  { title: 'Settings', items: [{ path: '/settings', label: 'Hari Kerja & Libur', icon: CalendarDays, permissions: ['settings.working_day.manage', 'settings.holiday.manage'] }, { path: '/settings/organization', label: 'Organisasi', icon: Building2, permissions: ['settings.organization.view'] }] },
];

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const [collapsed, setCollapsed] = React.useState(() => typeof window !== 'undefined' && localStorage.getItem('assetra-sidebar') === 'collapsed');
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  const logoutMutation = useMutation({ mutationFn: logout, onSuccess: () => { queryClient.setQueryData(AUTH_QUERY_KEY, null); navigate('/login'); } });
  const isActive = (path: string) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
  const toggleCollapsed = () => setCollapsed(previous => { const next = !previous; localStorage.setItem('assetra-sidebar', next ? 'collapsed' : 'expanded'); return next; });
  const initials = user?.name ? user.name.split(' ').map(part => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() : 'A';
  const visibleGroups = NAV_GROUPS.map(group => ({ ...group, items: group.items.filter(item => item.permissions.some(hasPermission)) })).filter(group => group.items.length > 0);
  const currentItem = NAV_GROUPS.flatMap(group => group.items).find(item => isActive(item.path));

  React.useEffect(() => setMobileOpen(false), [location.pathname]);

  const renderSidebar = (compact: boolean, onNavigate?: () => void) => (
    <div className={cn('flex h-full flex-col overflow-hidden text-sidebar-foreground transition-[width] duration-300 ease-in-out', compact ? 'w-[76px]' : 'w-72')}>
      <div className={cn('flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border px-4 transition-all duration-300', compact && 'px-5')}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent font-bold text-sidebar-accentForeground shadow-sm">A</div>
        <div className={cn('whitespace-nowrap transition-all duration-200 overflow-hidden', compact ? 'max-w-0 -translate-x-2 opacity-0' : 'max-w-52 translate-x-0 opacity-100')}>
          <p className="font-semibold">Assetra</p><p className="text-[11px] text-sidebar-muted">Enterprise Compliance</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-5 scrollbar-thin">
        <div className="space-y-5">
          {visibleGroups.map(group => <div key={group.title}>
            <p className={cn('overflow-hidden whitespace-nowrap text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted transition-all duration-200', compact ? 'mb-0 max-h-0 px-0 opacity-0' : 'mb-2 max-h-5 px-3 opacity-100')}>{group.title}</p>
            <div className="space-y-1">{group.items.map(item => { const Icon = item.icon; return <Link key={item.path} to={item.path} title={compact ? item.label : undefined} onClick={onNavigate} className={cn('flex h-10 items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200', compact ? 'justify-center px-0' : 'px-3', isActive(item.path) ? 'bg-sidebar-accent text-sidebar-accentForeground shadow-sm' : 'text-sidebar-muted hover:bg-sidebar-border/50 hover:text-sidebar-foreground')}><Icon className="h-5 w-5 shrink-0" /><span className={cn('whitespace-nowrap overflow-hidden transition-all duration-200', compact ? 'max-w-0 -translate-x-2 opacity-0' : 'max-w-52 opacity-100')}>{item.label}</span></Link>; })}</div>
          </div>)}
        </div>
      </nav>
      <div className="h-14 shrink-0 border-t border-sidebar-border px-4 flex items-center text-xs text-sidebar-muted"><span className={cn('whitespace-nowrap transition-opacity duration-200', compact && 'opacity-0')}>Assetra v0.0.1</span></div>
    </div>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-screen bg-background">
        <aside className={cn('sticky top-0 hidden h-screen shrink-0 overflow-hidden bg-sidebar transition-[width] duration-300 ease-in-out lg:block', collapsed ? 'w-[76px]' : 'w-72')}>{renderSidebar(collapsed)}</aside>

        <div className={cn('fixed inset-0 z-50 transition-[visibility] duration-300 lg:hidden', mobileOpen ? 'visible' : 'invisible pointer-events-none')}>
          <div className={cn('absolute inset-0 bg-black/60 transition-opacity duration-300', mobileOpen ? 'opacity-100' : 'opacity-0')} onClick={() => setMobileOpen(false)} />
          <aside className={cn('absolute left-0 top-0 h-full w-72 bg-sidebar shadow-2xl transition-transform duration-300 ease-out', mobileOpen ? 'translate-x-0' : '-translate-x-full')}>{renderSidebar(false, () => setMobileOpen(false))}</aside>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/90 backdrop-blur px-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></Button>
              <Button variant="ghost" size="icon" className="hidden lg:inline-flex" onClick={toggleCollapsed} aria-label={collapsed ? 'Buka sidebar' : 'Tutup sidebar'}><ChevronLeft className={cn('h-5 w-5 transition-transform duration-300', collapsed && 'rotate-180')} /></Button>
              <div><p className="font-semibold">{currentItem?.label ?? 'Dashboard'}</p><p className="text-xs text-muted-foreground">{user?.roles?.join(', ') ?? 'User'}</p></div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon"><Bell className="h-4 w-4" /></Button><ThemeToggle /><Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)}><Settings className="h-4 w-4" /></Button>
              <DropdownMenu><DropdownMenuTrigger asChild><button className="ml-1 flex items-center gap-2 rounded-lg p-1.5 hover:bg-accent"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{initials}</div></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>{user?.name ?? 'User'}</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onClick={() => navigate('/settings/organization')}><Building2 className="mr-2 h-4 w-4" />Organisasi</DropdownMenuItem><DropdownMenuItem onClick={() => setSettingsOpen(true)}><Settings className="mr-2 h-4 w-4" />Tampilan</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onClick={() => logoutMutation.mutate()} className="text-destructive"><LogOut className="mr-2 h-4 w-4" />Keluar</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-7xl"><Outlet /></div></main>
        </div>
        <ThemeSettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </div>
    </TooltipProvider>
  );
}
