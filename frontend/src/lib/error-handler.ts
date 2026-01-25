/**
 * Centralized Error Handler
 * 
 * Provides utilities for categorizing, formatting, and displaying errors
 * in a user-friendly manner throughout the application.
 */

import { showToast } from './toast';

/**
 * Error categories for better error handling
 */
export enum ErrorCategory {
    NETWORK = 'network',
    AUTH = 'auth',
    VALIDATION = 'validation',
    SERVER = 'server',
    NOT_FOUND = 'not_found',
    UNKNOWN = 'unknown',
}

/**
 * Categorize an error based on its properties
 */
export function categorizeError(error: any): ErrorCategory {
    // Network errors
    if (error.message?.includes('Network Error') ||
        error.code === 'ECONNABORTED' ||
        error.code === 'ERR_NETWORK' ||
        !navigator.onLine) {
        return ErrorCategory.NETWORK;
    }

    // Auth errors
    if (error.response?.status === 401 || error.response?.status === 403) {
        return ErrorCategory.AUTH;
    }

    // Validation errors
    if (error.response?.status === 422 || error.response?.status === 400) {
        return ErrorCategory.VALIDATION;
    }

    // Not found
    if (error.response?.status === 404) {
        return ErrorCategory.NOT_FOUND;
    }

    // Server errors
    if (error.response?.status >= 500) {
        return ErrorCategory.SERVER;
    }

    return ErrorCategory.UNKNOWN;
}

/**
 * Get user-friendly error message based on category
 */
export function getUserFriendlyMessage(error: any, category?: ErrorCategory): string {
    const errorCategory = category || categorizeError(error);

    // Try to get message from error response
    const serverMessage = error.response?.data?.message;

    switch (errorCategory) {
        case ErrorCategory.NETWORK:
            return 'Network connection issue. Please check your internet connection and try again.';

        case ErrorCategory.AUTH:
            if (error.response?.status === 401) {
                return 'Your session has expired. Please log in again.';
            }
            return serverMessage || "You don't have permission to perform this action.";

        case ErrorCategory.VALIDATION:
            return serverMessage || 'Please check your input and try again.';

        case ErrorCategory.NOT_FOUND:
            return serverMessage || 'The requested resource was not found.';

        case ErrorCategory.SERVER:
            return 'A server error occurred. Please try again later.';

        case ErrorCategory.UNKNOWN:
        default:
            return serverMessage || 'An unexpected error occurred. Please try again.';
    }
}

/**
 * Log error for debugging/monitoring
 */
export function logError(error: Error | any, context?: string) {
    const category = categorizeError(error);
    const timestamp = new Date().toISOString();

    // Sanitize error data in production
    const errorData = {
        category,
        message: error.message,
        stack: error.stack,
        response: error.response?.data,
        status: error.response?.status,
    };

    // In production, sanitize sensitive data
    const dataToLog = process.env.NODE_ENV === 'production'
        ? sanitizeForLogging(errorData)
        : errorData;

    console.error(`[${timestamp}] Error in ${context || 'Application'}:`, dataToLog);

    // TODO: Send to error tracking service in production
    // if (process.env.NODE_ENV === 'production') {
    //   sendToErrorTracking({
    //     error: sanitizeForLogging(error),
    //     category,
    //     context,
    //     timestamp,
    //     userAgent: navigator.userAgent,
    //   });
    // }
}

/**
 * Sanitize data for logging (remove sensitive information in production)
 */
function sanitizeForLogging(data: any): any {
    if (typeof data !== 'object' || data === null) {
        return data;
    }

    const sensitiveKeys = [
        'password', 'token', 'accessToken', 'refreshToken',
        'secret', 'apiKey', 'authorization', 'cookie'
    ];

    const sanitized: any = Array.isArray(data) ? [] : {};

    for (const [key, value] of Object.entries(data)) {
        const keyLower = key.toLowerCase();

        if (sensitiveKeys.some(k => keyLower.includes(k))) {
            sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeForLogging(value);
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
}

/**
 * Handle error with toast notification
 */
export function handleErrorWithToast(error: any, context?: string, customMessage?: string) {
    logError(error, context);

    const category = categorizeError(error);
    const message = customMessage || getUserFriendlyMessage(error, category);

    // Show toast based on error severity
    if (category === ErrorCategory.AUTH) {
        showToast.warning(message);
    } else if (category === ErrorCategory.VALIDATION) {
        showToast.error(message);
    } else if (category === ErrorCategory.NETWORK || category === ErrorCategory.SERVER) {
        showToast.error(message);
    } else {
        showToast.info(message);
    }
}

/**
 * Extract validation errors from API response
 */
export function extractValidationErrors(error: any): Record<string, string> | null {
    if (categorizeError(error) !== ErrorCategory.VALIDATION) {
        return null;
    }

    const errors = error.response?.data?.errors;
    if (!errors) {
        return null;
    }

    // Handle different error formats
    if (Array.isArray(errors)) {
        // Convert array to object
        return errors.reduce((acc, err) => {
            if (err.field && err.message) {
                acc[err.field] = err.message;
            }
            return acc;
        }, {} as Record<string, string>);
    }

    if (typeof errors === 'object') {
        return errors;
    }

    return null;
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
): Promise<T> {
    let lastError: any;

    for (let i = 0; i <= maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            const category = categorizeError(error);

            // Don't retry auth or validation errors
            if (category === ErrorCategory.AUTH || category === ErrorCategory.VALIDATION) {
                throw error;
            }

            // Don't retry if this is the last attempt
            if (i === maxRetries) {
                break;
            }

            // Calculate delay with exponential backoff
            const delay = baseDelay * Math.pow(2, i);
            console.log(`Retry attempt ${i + 1}/${maxRetries} after ${delay}ms`);

            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}
