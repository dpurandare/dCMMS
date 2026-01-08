'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { api } from '@/lib/api-client';

interface AuthGuardProps {
    children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
    const router = useRouter();
    const { isAuthenticated, logout } = useAuthStore();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            if (!isAuthenticated) {
                router.push('/auth/login');
                return;
            }

            try {
                // Verify token validity with backend
                // Note: This will automatically refresh token if expired (via apiClient interceptor)
                await api.get('/auth/me');
                setIsChecking(false);
            } catch (error) {
                console.error('Auth verification failed:', error);
                logout();
                router.push('/auth/login');
            }
        };

        checkAuth();
    }, [isAuthenticated, router, logout]);

    if (isChecking) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
                    <p className="text-slate-600">Verifying session...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
