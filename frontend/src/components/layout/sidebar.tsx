'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Wrench,
  Package,
  Bell,
  BarChart3,
  FileText,
  ScrollText,
  Settings,
  HelpCircle,
  Book,
  MoreVertical,
  LogOut,
  User,
  Brain,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/store/auth-store';
import { usePermissions } from '@/hooks/use-permissions';
import type { Permission } from '@/lib/permissions';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  badgeVariant?: 'default' | 'destructive';
  permissions?: Permission[];
}

const mainNavItems: NavItem[] = [
  { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Work Orders', href: '/work-orders', icon: Wrench, permissions: ['read:work-orders'] },
  { label: 'Assets', href: '/assets', icon: Package, permissions: ['read:assets'] },
  { label: 'Alerts', href: '/alerts', icon: Bell, permissions: ['read:alerts'] },
  { label: 'Analytics', href: '/analytics/dashboard', icon: BarChart3, permissions: ['read:analytics'] },
  { label: 'Reports', href: '/reports', icon: FileText, permissions: ['read:reports'] },
  { label: 'Compliance', href: '/compliance-reports', icon: ScrollText, permissions: ['read:compliance'] },
];

const mlNavItems: NavItem[] = [
  { label: 'Model Registry', href: '/ml/models', icon: Brain, permissions: ['read:ml-features'] },
  { label: 'Forecasts', href: '/ml/forecasts', icon: TrendingUp, permissions: ['read:forecasts'] },
  { label: 'Anomalies', href: '/ml/anomalies', icon: AlertTriangle, permissions: ['read:alerts'] },
  { label: 'AI Assistant', href: '/genai', icon: Brain, permissions: ['use:genai'] },
];

const secondaryNavItems: NavItem[] = [
  { label: 'Settings', href: '/settings', icon: Settings },
  { label: 'Help & Support', href: '/help', icon: HelpCircle },
  { label: 'Documentation', href: '/docs', icon: Book },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { canAll } = usePermissions();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const getUserInitials = () => {
    if (!user) return 'U';
    const nameParts = user.username?.split(' ') || [user.email];
    if (nameParts.length > 1) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
    }
    return (nameParts[0]?.[0] || 'U').toUpperCase();
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/auth/login';
  };

  const filterNavItems = (items: NavItem[]) => {
    return items.filter((item) => {
      if (!item.permissions || item.permissions.length === 0) {
        return true; // No permissions required, show to everyone
      }
      return canAll(item.permissions);
    });
  };

  const filteredMainNavItems = filterNavItems(mainNavItems);
  const filteredMlNavItems = filterNavItems(mlNavItems);
  const filteredSecondaryNavItems = filterNavItems(secondaryNavItems);

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-white">
      {/* Logo Section */}
      <div className="border-b p-6">
        <h1 className="text-2xl font-bold text-slate-900">dCMMS</h1>
      </div>

      {/* Navigation Menu */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {/* Main Navigation */}
          {filteredMainNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group relative flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                {isActive && (
                  <div className="absolute left-0 h-full w-0.5 rounded-r bg-blue-600" />
                )}
                <Icon
                  className={cn(
                    'h-5 w-5',
                    isActive ? 'text-blue-600' : 'text-slate-600 group-hover:text-slate-900'
                  )}
                />
                <span className="flex-1">{item.label}</span>
                {item.badge !== undefined && (
                  <Badge
                    variant={item.badgeVariant || 'default'}
                    className={cn(
                      'min-w-[20px] px-2 py-0 text-xs',
                      item.badgeVariant === 'destructive'
                        ? 'bg-red-500 hover:bg-red-600'
                        : 'bg-blue-500 hover:bg-blue-600'
                    )}
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}

          {/* Machine Learning */}
          {filteredMlNavItems.length > 0 && (
            <div className="px-3 py-2">
              <h2 className="mb-2 px-4 text-xs font-semibold tracking-tight text-slate-500">
                Machine Learning
              </h2>
              <div className="space-y-1">
                {filteredMlNavItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'group relative flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-all',
                      isActive
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 h-full w-0.5 rounded-r bg-blue-600" />
                    )}
                    <Icon
                      className={cn(
                        'h-5 w-5',
                        isActive ? 'text-blue-600' : 'text-slate-600 group-hover:text-slate-900'
                      )}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              </div>
            </div>
          )}

          {/* Divider */}
          <Separator className="my-4" />

          {/* Settings & Support */}
          {filteredSecondaryNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group relative flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                {isActive && (
                  <div className="absolute left-0 h-full w-0.5 rounded-r bg-blue-600" />
                )}
                <Icon
                  className={cn(
                    'h-5 w-5',
                    isActive ? 'text-blue-600' : 'text-slate-600 group-hover:text-slate-900'
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User Profile Section */}
      <div className="border-t p-4">
        <DropdownMenu open={isUserMenuOpen} onOpenChange={setIsUserMenuOpen}>
          <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-slate-100 transition-colors">
            <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-semibold text-white">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {user?.username || user?.email}
              </p>
              <p className="text-xs text-slate-500 capitalize truncate">
                {user?.role || 'User'}
              </p>
            </div>
            <MoreVertical className="h-5 w-5 text-slate-400" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem>
              <User className="mr-3 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-3 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600"
              onClick={handleLogout}
            >
              <LogOut className="mr-3 h-4 w-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
