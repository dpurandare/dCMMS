/**
 * Central API Configuration
 * 
 * This module provides centralized configuration for all API calls.
 * Configuration can be loaded at runtime via environment variables.
 */

export interface ApiConfig {
    /** Base URL for the API (e.g., http://localhost:3001/api/v1) */
    baseURL: string;
    /** Request timeout in milliseconds */
    timeout: number;
    /** Enable request/response logging */
    enableLogging: boolean;
    /** Retry configuration */
    retry: {
        maxRetries: number;
        retryDelay: number;
    };
}

/**
 * Load API configuration from environment variables
 * Falls back to sensible defaults for development
 */
export const API_CONFIG: ApiConfig = {
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
    timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000', 10),
    enableLogging: process.env.NEXT_PUBLIC_ENABLE_API_LOGGING === 'true' || process.env.NODE_ENV === 'development',
    retry: {
        maxRetries: parseInt(process.env.NEXT_PUBLIC_API_MAX_RETRIES || '3', 10),
        retryDelay: parseInt(process.env.NEXT_PUBLIC_API_RETRY_DELAY || '1000', 10),
    },
};

/**
 * Application configuration
 */
export const APP_CONFIG = {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'dCMMS',
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    enableOfflineMode: process.env.NEXT_PUBLIC_ENABLE_OFFLINE_MODE === 'true',
    enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
};

/**
 * Validate configuration on app startup
 * Throws error if critical configuration is missing
 */
export const validateConfig = (): void => {
    if (!API_CONFIG.baseURL) {
        throw new Error('API_CONFIG.baseURL is required');
    }

    if (API_CONFIG.timeout < 1000) {
        console.warn('API timeout is very low (<1s), this may cause issues');
    }

    if (API_CONFIG.enableLogging) {
        console.log('📡 API Configuration:', {
            baseURL: API_CONFIG.baseURL,
            timeout: `${API_CONFIG.timeout}ms`,
            retries: API_CONFIG.retry.maxRetries,
        });
    }
};

// Run validation on module load (only in browser)
if (typeof window !== 'undefined') {
    validateConfig();
}
