/**
 * Toast Notification Utility
 * 
 * Simple toast notification system for displaying temporary messages to users.
 * Integrates with sonner library if available, otherwise provides fallback.
 */

import { toast as sonnerToast } from 'sonner';

interface ToastOptions {
    duration?: number;
    position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
    action?: {
        label: string;
        onClick: () => void;
    };
}

/**
 * Toast notification API
 */
export const showToast = {
    success: (message: string, options?: ToastOptions) => {
        sonnerToast.success(message, {
            duration: options?.duration || 3000,
            position: options?.position || 'top-right',
            action: options?.action,
        });
    },

    error: (message: string, options?: ToastOptions) => {
        sonnerToast.error(message, {
            duration: options?.duration || 4000,
            position: options?.position || 'top-right',
            action: options?.action,
        });
    },

    warning: (message: string, options?: ToastOptions) => {
        sonnerToast.warning(message, {
            duration: options?.duration || 3500,
            position: options?.position || 'top-right',
            action: options?.action,
        });
    },

    info: (message: string, options?: ToastOptions) => {
        sonnerToast.info(message, {
            duration: options?.duration || 3000,
            position: options?.position || 'top-right',
            action: options?.action,
        });
    },

    loading: (message: string) => {
        return sonnerToast.loading(message);
    },

    promise: <T,>(
        promise: Promise<T>,
        messages: {
            loading: string;
            success: string | ((data: T) => string);
            error: string | ((error: any) => string);
        }
    ) => {
        sonnerToast.promise(promise, messages);
        return promise;
    },

    dismiss: (toastId?: string | number) => {
        sonnerToast.dismiss(toastId);
    },
};

/**
 * Convenience method for async operations
 */
export async function withToast<T>(
    promise: Promise<T>,
    messages: {
        loading?: string;
        success: string;
        error?: string;
    }
): Promise<T> {
    const toastId = messages.loading ? showToast.loading(messages.loading) : undefined;

    try {
        const result = await promise;
        if (toastId) showToast.dismiss(toastId);
        showToast.success(messages.success);
        return result;
    } catch (error) {
        if (toastId) showToast.dismiss(toastId);
        showToast.error(messages.error || 'An error occurred');
        throw error;
    }
}
