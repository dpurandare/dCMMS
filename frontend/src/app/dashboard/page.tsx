'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    // Verify token is still valid by fetching user profile
    const verifyAuth = async () => {
      try {
        await api.auth.getMe();
        setIsLoading(false);
      } catch (error) {
        console.error('Auth verification failed:', error);
        logout();
        router.push('/auth/login');
      }
    };

    verifyAuth();
  }, [isAuthenticated, router, logout]);

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      logout();
      router.push('/auth/login');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">dCMMS Dashboard</h1>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Welcome, {user?.username}!</h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">User Information</h3>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-gray-600">Email:</dt>
                    <dd className="text-gray-900">{user?.email}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-600">Username:</dt>
                    <dd className="text-gray-900">{user?.username}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-600">Role:</dt>
                    <dd className="text-gray-900 capitalize">{user?.role}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-600">Tenant ID:</dt>
                    <dd className="text-gray-900 font-mono text-xs">{user?.tenantId}</dd>
                  </div>
                </dl>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Quick Stats</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>📋 Work Orders: Coming soon</p>
                  <p>🔧 Assets: Coming soon</p>
                  <p>📍 Sites: Coming soon</p>
                  <p>⚠️ Active Alerts: Coming soon</p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 mt-4">
              <p className="text-sm text-gray-600">
                This is a placeholder dashboard. Full functionality will be implemented in upcoming sprints.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
