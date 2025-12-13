'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { alertsService } from '@/services/alerts.service';
import { Search, Bell, Plus, Menu, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs, BreadcrumbItem } from './breadcrumbs';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTutorial } from '@/components/common/TutorialProvider';

interface TopBarProps {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
  onMenuClick?: () => void;
  showSearch?: boolean;
  showNewButton?: boolean;
  newButtonText?: string;
  onNewClick?: () => void;
  actions?: React.ReactNode;
}

export function TopBar({
  title,
  breadcrumbs,
  onMenuClick,
  showSearch = true,
  showNewButton = true,
  newButtonText = 'New Work Order',
  onNewClick,
  actions,
}: TopBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const { user } = useAuthStore();
  const { startTour } = useTutorial();

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.tenantId) return;
      try {
        const { stats } = await alertsService.getAlertStats({ tenantId: user.tenantId });
        setUnreadNotifications(stats.active);
      } catch (error) {
        console.error('Failed to fetch alert stats:', error);
      }
    };

    fetchStats();
    // Poll every minute
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [user?.tenantId]);

  return (
    <div className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-6">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Title and Breadcrumbs */}
        <div>
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          {breadcrumbs && breadcrumbs.length > 0 && (
            <Breadcrumbs items={breadcrumbs} className="mt-1" />
          )}
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* Search Bar */}
        {showSearch && (
          <div className="hidden md:flex items-center gap-2 w-80 h-10 px-3 rounded-lg bg-slate-100 border border-transparent focus-within:bg-white focus-within:border-blue-300 focus-within:shadow-sm transition-all">
            <Search className="h-5 w-5 text-slate-400" />
            <Input
              type="search"
              placeholder="Search work orders, assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 border-0 bg-transparent p-0 text-sm placeholder:text-slate-500 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <kbd className="hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border border-slate-300 bg-white px-1.5 font-mono text-xs text-slate-400">
              ⌘K
            </kbd>
          </div>
        )}

        {/* Custom Actions */}
        {actions}

        {/* New Work Order Button */}
        {showNewButton && !actions && (
          <Button
            onClick={onNewClick}
            className="hidden md:flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            <span>{newButtonText}</span>
          </Button>
        )}

        {/* Help Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <HelpCircle className="h-5 w-5 text-slate-600" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => startTour('first-login')}>
              Restart Welcome Tour
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.open('https://docs.dcmms.com', '_blank')}>
              Documentation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <Button
          variant="outline"
          size="icon"
          className="relative h-10 w-10"
          aria-label="Notifications"
          onClick={() => window.location.href = '/alerts'}
        >
          <Bell className="h-5 w-5 text-slate-600" />
          {unreadNotifications > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white p-0 text-xs"
            >
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </Badge>
          )}
        </Button>
      </div>
    </div>
  );
}
