'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { api } from '@/lib/api-client';

interface AuthGuardProps {
    children: React.ReactNode;
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

export function AuthGuard({ children }: AuthGuardProps) {
    const router = useRouter();
    const { isAuthenticated, logout, setUser } = useAuthStore();
    const [isChecking, setIsChecking] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const checkAuth = async () => {
            if (!isAuthenticated) {
                router.push('/auth/login');
                return;
            }

            let retries = 0;
            let lastError: any = null;

            while (retries <= MAX_RETRIES) {
                try {
                    // Verify token validity with backend using centralized method
                    // This will automatically refresh token if expired via apiClient interceptor
                    const user = await api.auth.getMe();

                    // Update user in store with fresh data
                    setUser(user);
                    setIsChecking(false);
                    setError(null);
                    return;
                } catch (err: any) {
                    lastError = err;

                    // Check if it's a network error that we should retry
                    const isNetworkError = err.message?.includes('Network Error') ||
                        err.code === 'ECONNABORTED' ||
                        err.code === 'ERR_NETWORK';

                    // Check if it's a server error (5xx)
                    const isServerError = err.response?.status >= 500;

                    if ((isNetworkError || isServerError) && retries < MAX_RETRIES) {
                        // Retry with exponential backoff
                        retries++;
                        const delay = RETRY_DELAY_MS * Math.pow(2, retries - 1);
                        console.log(`Auth verification failed, retrying in ${delay}ms (attempt ${retries}/${MAX_RETRIES})`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }

                    // For 401/403 or after max retries, logout user
                    console.error('Auth verification failed:', err);
                    logout();
                    router.push('/auth/login');
                    return;
                }
            }

            // If we exhausted retries
            if (lastError) {
                console.error('Auth verification failed after retries:', lastError);
                setError('Unable to verify session. Please try again.');
                setIsChecking(false);
            }
        };

        checkAuth();
    }, [isAuthenticated, router, logout, setUser]);

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

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-center">
                    <p className="text-red-600">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}

