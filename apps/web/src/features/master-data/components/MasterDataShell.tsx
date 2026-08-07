import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ClipboardList, FolderKanban, LayoutGrid, MapPin, PackageSearch } from 'lucide-react';
import { useAuth } from '@/features/auth/useAuth';
import { cn } from '@/lib/utils';

const tabs = [
  {
    path: '/master-data',
    label: 'Ringkasan',
    icon: LayoutGrid,
    permissions: ['master.category.view', 'master.item_type.view', 'master.area.view'],
    end: true,
  },
  {
    path: '/master/categories',
    label: 'Kategori',
    icon: FolderKanban,
    permissions: ['master.category.view', 'master.category.manage'],
  },
  {
    path: '/master/item-types',
    label: 'Jenis Item',
    icon: PackageSearch,
    permissions: ['master.item_type.view', 'master.item_type.manage'],
  },
  {
    path: '/master/areas',
    label: 'Area',
    icon: MapPin,
    permissions: ['master.area.view', 'master.area.manage'],
  },
  {
    path: '/checklist/templates',
    label: 'Checklist Master',
    icon: ClipboardList,
    permissions: ['checklist_template.view'],
  },
];

export function MasterDataShell() {
  const location = useLocation();
  const { hasPermission } = useAuth();
  const visibleTabs = tabs.filter(tab => tab.permissions.some(hasPermission));

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/70 bg-card p-1.5 shadow-sm">
        <nav
          className="flex gap-1 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Navigasi Master Data"
        >
          {visibleTabs.map(tab => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                end={tab.end}
                className={({ isActive }) => cn(
                  'group flex min-w-max items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-300',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {({ isActive }) => (
                  <>
                    <Icon className={cn('h-4 w-4 transition-transform duration-300 group-hover:scale-110', isActive && 'text-primary-foreground')} />
                    {tab.label}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div
        key={location.pathname}
        className="animate-in fade-in slide-in-from-right-2 duration-300"
      >
        <Outlet />
      </div>
    </div>
  );
}
