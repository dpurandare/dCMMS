'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { api } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench, Package, Bell, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
  change?: number;
  changeLabel?: string;
}

function StatCard({
  title,
  value,
  icon,
  iconBgColor,
  iconColor,
  change,
  changeLabel,
}: StatCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <Card className="transition-all hover:shadow-md hover:-translate-y-0.5">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBgColor}`}>
          <div className={iconColor}>{icon}</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-slate-900">{value}</div>
        {change !== undefined && (
          <div className="mt-2 flex items-center gap-1 text-sm">
            {isPositive ? (
              <ArrowUpRight className="h-4 w-4 text-green-600" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-red-600" />
            )}
            <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
              {Math.abs(change)}%
            </span>
            {changeLabel && <span className="text-slate-500">{changeLabel}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    // Verify token is still valid
    const verifyAuth = async () => {
      try {
        await api.auth.getMe();
      } catch (error) {
        console.error('Auth verification failed:', error);
        logout();
        router.push('/auth/login');
      }
    };

    verifyAuth();
  }, [isAuthenticated, router, logout]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  return (
    <DashboardLayout
      title="Dashboard"
      breadcrumbs={[{ label: 'Home' }]}
    >
      {/* Welcome Section */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">
          Welcome back, {user?.username || 'User'}!
        </h2>
        <p className="text-slate-600">Here&apos;s what&apos;s happening with your operations today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          title="Active Work Orders"
          value="24"
          icon={<Wrench className="h-6 w-6" />}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
          change={12}
          changeLabel="from last week"
        />
        <StatCard
          title="Total Assets"
          value="156"
          icon={<Package className="h-6 w-6" />}
          iconBgColor="bg-green-50"
          iconColor="text-green-600"
          change={3}
          changeLabel="new this month"
        />
        <StatCard
          title="Active Alerts"
          value="8"
          icon={<Bell className="h-6 w-6" />}
          iconBgColor="bg-red-50"
          iconColor="text-red-600"
          change={-25}
          changeLabel="from yesterday"
        />
        <StatCard
          title="Uptime"
          value="99.2%"
          icon={<TrendingUp className="h-6 w-6" />}
          iconBgColor="bg-purple-50"
          iconColor="text-purple-600"
          change={0.5}
          changeLabel="this month"
        />
      </div>

      {/* Recent Activity & Quick Links */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Work Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Work Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      WO-{1000 + i}: Inverter Maintenance
                    </p>
                    <p className="text-xs text-slate-500">Solar Farm A - Section {i}</p>
                  </div>
                  <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
                    In Progress
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Total Sites</span>
                <span className="text-sm font-semibold text-slate-900">12</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Technicians Active</span>
                <span className="text-sm font-semibold text-slate-900">8</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Pending Approvals</span>
                <span className="text-sm font-semibold text-slate-900">3</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Overdue Work Orders</span>
                <span className="text-sm font-semibold text-red-600">2</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Avg. Completion Time</span>
                <span className="text-sm font-semibold text-slate-900">4.2 days</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
