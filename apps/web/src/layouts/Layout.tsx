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
import { LayoutDashboard, Boxes, ClipboardCheck, FileText, Clock, QrCode, Printer, MapPin, Tags, Wrench, Users, ShieldCheck, CalendarDays, Building2, LogOut, ChevronLeft, Menu, Bell, Settings, type LucideIcon } from 'lucide-react';

interface NavItem { path: string; label: string; icon: LucideIcon; permissions: string[]; }
interface NavGroup { title: string; items: NavItem[]; }

const NAV_GROUPS: NavGroup[] = [
  { title: 'Home', items: [{ path: '/', label: 'Dashboard', icon: LayoutDashboard, permissions: ['dashboard.view'] }] },
  { title: 'Operasional', items: [
    { path: '/inventory', label: 'Inventaris', icon: Boxes, permissions: ['inventory.view'] },
    { path: '/compliance', label: 'Pelaksanaan Checklist', icon: ClipboardCheck, permissions: ['compliance.view', 'compliance.execute'] },
  ]},
  { title: 'Compliance', items: [
    { path: '/checklist/templates', label: 'Checklist Master', icon: FileText, permissions: ['checklist_template.view'] },
    { path: '/checklist/sessions', label: 'Sesi Checklist', icon: Clock, permissions: ['checklist_session.view'] },
  ]},
  { title: 'Reporting', items: [
    { path: '/qr', label: 'QR Center', icon: QrCode, permissions: ['qr.view'] },
    { path: '/reports', label: 'Print Center', icon: Printer, permissions: ['reports.view'] },
  ]},
  { title: 'Master Data', items: [
    { path: '/master/areas', label: 'Area', icon: MapPin, permissions: ['master.area.view'] },
    { path: '/master/categories', label: 'Kategori Inventaris', icon: Tags, permissions: ['master.category.view'] },
    { path: '/master/item-types', label: 'Jenis Item', icon: Wrench, permissions: ['master.item_type.view'] },
  ]},
  { title: 'Administration', items: [
    { path: '/users', label: 'Pengguna', icon: Users, permissions: ['users.view'] },
    { path: '/roles', label: 'Role & Permission', icon: ShieldCheck, permissions: ['roles.view'] },
  ]},
  { title: 'Settings', items: [
    { path: '/settings', label: 'Hari Kerja & Libur', icon: CalendarDays, permissions: ['settings.working_day.manage'] },
    { path: '/settings/organization', label: 'Organisasi', icon: Building2, permissions: ['settings.organization.view'] },
  ]},
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
  const toggleCollapsed = () => setCollapsed(prev => { const next = !prev; localStorage.setItem('assetra-sidebar', next ? 'collapsed' : 'expanded'); return next; });
  const initials = user?.name ? user.name.split(' ').map(part => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() : 'A';
  const visibleGroups = NAV_GROUPS.map(group => ({ ...group, items: group.items.filter(item => item.permissions.length === 0 || item.permissions.some(hasPermission)) })).filter(group => group.items.length > 0);
  const currentItem = NAV_GROUPS.flatMap(group => group.items).find(item => isActive(item.path));

  const sidebarContent = <div className={cn('flex h-full flex-col transition-all duration-300', collapsed ? 'w-[76px]' : 'w-72')}>
    <div className={cn('flex h-16 items-center gap-3 border-b border-sidebar-border px-4', collapsed && 'justify-center px-2')}><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accentForeground font-bold text-lg">A</div>{!collapsed && <div className="flex flex-col overflow-hidden"><span className="truncate text-lg font-semibold">Assetra</span><span className="truncate text-[11px] text-sidebar-muted">Enterprise Compliance</span></div>}</div>
    <nav className="flex-1 overflow-y-auto px-3 py-5"><div className="space-y-6">{visibleGroups.map(group => <div key={group.title}>{!collapsed && <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted">{group.title}</div>}<div className="space-y-1">{group.items.map(item => { const Icon = item.icon; const content = <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)} className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium', collapsed && 'justify-center px-0', isActive(item.path) ? 'bg-sidebar-accent text-sidebar-accentForeground' : 'text-sidebar-muted hover:bg-sidebar-border/40 hover:text-sidebar-foreground')}><Icon className="h-5 w-5 shrink-0" />{!collapsed && <span className="truncate">{item.label}</span>}</Link>; return collapsed ? <div key={item.path} className="relative group/tooltip">{content}<span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-sidebar-accent px-2 py-1 text-xs opacity-0 shadow-lg group-hover/tooltip:opacity-100">{item.label}</span></div> : content; })}</div></div>)}</div></nav>
    <div className="border-t border-sidebar-border p-4 text-xs text-sidebar-muted">{collapsed ? 'v0.0.1' : 'Assetra v0.0.1'}</div>
  </div>;

  return <TooltipProvider delayDuration={200}><div className="flex min-h-screen bg-background">
    <aside className={cn('sticky top-0 hidden h-screen shrink-0 bg-sidebar lg:block', collapsed ? 'w-[76px]' : 'w-72')}>{sidebarContent}</aside>
    {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} /><aside className="absolute left-0 top-0 h-full bg-sidebar shadow-xl">{sidebarContent}</aside></div>}
    <div className="flex min-w-0 flex-1 flex-col"><header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur sm:px-6"><div className="flex items-center gap-3"><Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></Button><Button variant="ghost" size="icon" className="hidden lg:inline-flex" onClick={toggleCollapsed}><ChevronLeft className={cn('h-5 w-5', collapsed && 'rotate-180')} /></Button><div><span className="text-sm font-semibold sm:text-base">{currentItem?.label ?? 'Dashboard'}</span><span className="hidden text-xs text-muted-foreground sm:block">{user?.roles?.join(', ') ?? 'User'}</span></div></div><div className="flex items-center gap-1 sm:gap-2"><Button variant="ghost" size="icon"><Bell className="h-[18px] w-[18px]" /></Button><ThemeToggle /><Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)}><Settings className="h-[18px] w-[18px]" /></Button><DropdownMenu><DropdownMenuTrigger asChild><button className="ml-1 flex items-center gap-2 rounded-lg p-1.5 hover:bg-accent"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{initials}</div><div className="hidden flex-col text-left md:flex"><span className="text-sm font-medium">{user?.name ?? 'User'}</span><span className="text-xs text-muted-foreground">{user?.roles?.[0] ?? ''}</span></div></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-56"><DropdownMenuLabel>{user?.name ?? 'User'}</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onClick={() => navigate('/settings/organization')}><Building2 className="mr-2 h-4 w-4" /> Organization</DropdownMenuItem><DropdownMenuItem onClick={() => setSettingsOpen(true)}><Settings className="mr-2 h-4 w-4" /> Appearance</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive" onClick={() => logoutMutation.mutate()}><LogOut className="mr-2 h-4 w-4" />Logout</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></header><main className="flex-1 p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-7xl"><Outlet /></div></main></div>
    <ThemeSettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
  </div></TooltipProvider>;
}
